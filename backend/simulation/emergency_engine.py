"""
Emergency Simulator Engine
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain

Strictly adheres to NON-NEGOTIABLE SIMULATION SPECIFICATIONS:
- Interactive Before vs After disaster scenario simulation.
- Scenarios:
    1. Normal Baseline (SCN_NORMAL)
    2. Heavy Monsoon Surge (SCN_MONSOON)
    3. Flood / Disruption (SCN_FLOOD)
    4. Acute Disease Outbreak (SCN_OUTBREAK)
    5. Sudden Patient Footfall Surge (SCN_SURGE)
    6. Central Depot Delivery Disruption (SCN_DELIVERY_DISRUPT)
- Directly recalculates patient volumes, disease indices, weather alerts, bed occupancy,
  stockout risks, forecasts, and redistribution transfers.
- Returns verified BEFORE vs AFTER comparative metrics.
"""

import os
import sys
import json
import datetime
import sqlite3
from typing import Optional, List
import numpy as np
import pandas as pd
import joblib

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.database import get_db
from backend.optimizer.redistribution_engine import run_redistribution_optimizer

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def get_current_kpi_snapshot(conn: sqlite3.Connection) -> dict:
    """Computes instant high-level operational KPIs from current database state."""
    cursor = conn.cursor()
    
    # 1. Total critical and high risk PHC-medicine pairs
    cursor.execute("SELECT COUNT(*) FROM stockout_risks WHERE severity = 'CRITICAL'")
    critical_risks = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM stockout_risks WHERE severity = 'HIGH'")
    high_risks = cursor.fetchone()[0]
    
    # Distinct PHCs with at least one critical/high risk
    cursor.execute("SELECT COUNT(DISTINCT phc_id) FROM stockout_risks WHERE severity IN ('CRITICAL', 'HIGH')")
    phcs_at_risk = cursor.fetchone()[0]
    
    # 2. Total beds available and occupied
    cursor.execute("""
        SELECT SUM(bed_capacity), SUM(beds_occupied), SUM(beds_available) 
        FROM beds WHERE date = (SELECT MAX(date) FROM beds)
    """)
    bed_row = cursor.fetchone()
    total_beds = bed_row[0] or 0
    beds_occupied = bed_row[1] or 0
    beds_available = bed_row[2] or 0
    
    # 3. Active recommended transfers and volume
    cursor.execute("""
        SELECT COUNT(*), COALESCE(SUM(quantity), 0) 
        FROM transfers WHERE status = 'RECOMMENDED'
    """)
    trf_row = cursor.fetchone()
    recommended_transfers = trf_row[0] or 0
    transfer_volume = trf_row[1] or 0
    
    # 4. Average daily OPD
    cursor.execute("""
        SELECT AVG(opd_patients), AVG(disease_index) 
        FROM healthcare_demand WHERE date = (SELECT MAX(date) FROM healthcare_demand)
    """)
    dem_row = cursor.fetchone()
    avg_opd = round(float(dem_row[0] or 0), 1)
    avg_disease_index = round(float(dem_row[1] or 0), 2)
    
    return {
        "critical_risks": critical_risks,
        "high_risks": high_risks,
        "phcs_at_risk": phcs_at_risk,
        "total_beds": total_beds,
        "beds_occupied": beds_occupied,
        "beds_available": beds_available,
        "recommended_transfers": recommended_transfers,
        "transfer_volume": transfer_volume,
        "avg_daily_opd": avg_opd,
        "avg_disease_index": avg_disease_index
    }

def run_emergency_scenario(scenario_id: str) -> dict:
    """Executes dynamic emergency scenario, recalculates risks & transfers, and returns comparative before/after."""
    print(f"--- Executing Emergency Simulation Scenario: {scenario_id} ---")
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Capture BEFORE snapshot
        before_kpi = get_current_kpi_snapshot(conn)
        
        # 2. Retrieve scenario configuration
        cursor.execute("SELECT name, description, parameters FROM emergency_scenarios WHERE scenario_id = ?", (scenario_id,))
        scen_row = cursor.fetchone()
        if not scen_row:
            raise ValueError(f"Unknown scenario ID: {scenario_id}")
            
        scenario_name = scen_row[0]
        scenario_desc = scen_row[1]
        params = json.loads(scen_row[2])
        
        return execute_scenario_core(conn, scenario_id, scenario_name, scenario_desc, params, before_kpi)

def execute_scenario_core(conn: sqlite3.Connection, scenario_id: str, scenario_name: str, scenario_desc: str, params: dict, before_kpi: dict) -> dict:
    """Core logic to apply disaster shock parameters, rerun forecasting, optimizer, and compute deltas."""
    cursor = conn.cursor()
    demand_factor = float(params.get("demand_factor", 1.0))
    disease_factor = float(params.get("disease_factor", 1.0))
    lead_time_mult = float(params.get("lead_time_multiplier", 1.0))
    affected_districts = params.get("affected_districts", [])
    temp_surge = float(params.get("temperature_surge", 0.0))
    rain_surge = float(params.get("rainfall_surge", 0.0))
    
    # 3. Apply scenario modifications to current day operational records
    cursor.execute("SELECT MAX(date) FROM healthcare_demand")
    latest_date = cursor.fetchone()[0]
    
    if affected_districts == ["ALL"] or len(affected_districts) == 0:
        district_filter = "1=1"
    else:
        dist_list_str = "', '".join(affected_districts)
        district_filter = f"phc_id IN (SELECT phc_id FROM phcs WHERE district_id IN ('{dist_list_str}'))"
        
    # Weather warning logic
    if scenario_id in ('SCN_FLOOD', 'SCN_CYCLONE'):
        warning_expr = "'RED'"
    elif scenario_id in ('SCN_MONSOON', 'SCN_HEATWAVE'):
        warning_expr = "'ORANGE'"
    elif scenario_id == 'SCN_NORMAL':
        warning_expr = "'GREEN'"
    else:
        warning_expr = "weather_warning"

    # Rainfall surge calculation
    if scenario_id in ('SCN_MONSOON', 'SCN_FLOOD'):
        rain_add = 75.0
    elif scenario_id == 'SCN_CYCLONE':
        rain_add = 120.0
    else:
        rain_add = rain_surge

    # Update demand, temperature & weather signals
    cursor.execute(f"""
        UPDATE healthcare_demand
        SET opd_patients = CAST(opd_patients * {demand_factor} AS INTEGER),
            ipd_patients = CAST(ipd_patients * {min(demand_factor * 1.25, 3.0)} AS INTEGER),
            disease_index = ROUND(MIN(disease_index * {disease_factor}, 3.8), 2),
            temperature = ROUND(temperature + {temp_surge}, 1),
            rainfall_mm = rainfall_mm + {rain_add},
            weather_warning = {warning_expr}
        WHERE date = '{latest_date}' AND {district_filter}
    """)
    
    # Update bed occupancies
    cursor.execute(f"""
        UPDATE beds
        SET beds_occupied = MIN(bed_capacity, CAST(beds_occupied * {demand_factor * 1.15} AS INTEGER)),
            beds_available = MAX(0, bed_capacity - MIN(bed_capacity, CAST(beds_occupied * {demand_factor * 1.15} AS INTEGER))),
            occupancy_rate = ROUND(CAST(MIN(bed_capacity, CAST(beds_occupied * {demand_factor * 1.15} AS INTEGER)) AS REAL) / bed_capacity, 2)
        WHERE date = '{latest_date}' AND {district_filter}
    """)
    
    # Update inventory depletion and lead time with strict mass conservation
    cursor.execute(f"""
        UPDATE inventory
        SET dispensed_quantity = MIN(opening_stock + received_quantity - damaged_quantity, CAST(dispensed_quantity * {demand_factor} AS INTEGER)),
            lead_time_days = CAST(lead_time_days * {lead_time_mult} AS INTEGER)
        WHERE date = '{latest_date}' AND {district_filter}
    """)
    cursor.execute(f"""
        UPDATE inventory
        SET closing_stock = opening_stock + received_quantity - dispensed_quantity - damaged_quantity
        WHERE date = '{latest_date}' AND {district_filter}
    """)
    
    # 4. Rerun ML models on modified operational state
    demand_model_path = os.path.join(MODELS_DIR, "demand_forecaster.joblib")
    stockout_model_path = os.path.join(MODELS_DIR, "stockout_classifier.joblib")
    
    if os.path.exists(demand_model_path) and os.path.exists(stockout_model_path):
        demand_model = joblib.load(demand_model_path)
        stockout_model = joblib.load(stockout_model_path)
        
        # Recompute forecasts and stockout risks
        from backend.ml.train_models import populate_operational_forecasts_and_risks, STOCKOUT_FEATURES
        populate_operational_forecasts_and_risks(
            conn, demand_model, 
            ["lag_1_demand", "lag_7_demand", "rolling_7_mean", "opd_patients", "disease_index", "rainfall_mm", "population_served", "day_of_week", "month"],
            28.0,
            stockout_model,
            STOCKOUT_FEATURES
        )
        
    # 5. Rerun Deterministic Redistribution Optimizer
    run_redistribution_optimizer(conn)
        
    # 6. Capture AFTER snapshot
    after_kpi = get_current_kpi_snapshot(conn)
    
    comparison = {
        "scenario_id": scenario_id,
        "scenario_name": scenario_name,
        "description": scenario_desc,
        "affected_districts": affected_districts,
        "parameters": params,
        "timestamp": datetime.datetime.now().isoformat(),
        "before": before_kpi,
        "after": after_kpi,
        "deltas": {
            "phcs_at_risk_delta": after_kpi["phcs_at_risk"] - before_kpi["phcs_at_risk"],
            "critical_risks_delta": after_kpi["critical_risks"] - before_kpi["critical_risks"],
            "beds_available_delta": after_kpi["beds_available"] - before_kpi["beds_available"],
            "recommended_transfers_delta": after_kpi["recommended_transfers"] - before_kpi["recommended_transfers"],
            "transfer_volume_delta": after_kpi["transfer_volume"] - before_kpi["transfer_volume"]
        }
    }
    
    print(f"Scenario {scenario_name} Complete.")
    print(f"  PHCs at High Risk: {before_kpi['phcs_at_risk']} -> {after_kpi['phcs_at_risk']} (Delta: +{comparison['deltas']['phcs_at_risk_delta']})")
    print(f"  Available Beds:    {before_kpi['beds_available']} -> {after_kpi['beds_available']} (Delta: {comparison['deltas']['beds_available_delta']})")
    print(f"  Recommended Transfers: {before_kpi['recommended_transfers']} -> {after_kpi['recommended_transfers']}")
    
    return comparison

def run_custom_emergency_scenario(
    name: str,
    description: str,
    demand_factor: float = 1.5,
    disease_factor: float = 1.5,
    lead_time_multiplier: float = 1.5,
    temperature_surge: float = 0.0,
    rainfall_surge: float = 0.0,
    affected_districts: Optional[list] = None
) -> dict:
    """Executes a custom user-defined emergency simulation scenario and saves it to the scenario catalog."""
    if affected_districts is None or len(affected_districts) == 0:
        affected_districts = ["ALL"]
        
    scenario_id = f"SCN_CUSTOM_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    params = {
        "demand_factor": demand_factor,
        "disease_factor": disease_factor,
        "lead_time_multiplier": lead_time_multiplier,
        "temperature_surge": temperature_surge,
        "rainfall_surge": rainfall_surge,
        "affected_districts": affected_districts
    }
    
    with get_db() as conn:
        cursor = conn.cursor()
        now_ts = datetime.datetime.now().isoformat()
        # Persist custom scenario in registry so it appears in scenario lists
        cursor.execute("""
            INSERT OR REPLACE INTO emergency_scenarios (scenario_id, name, description, parameters, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (scenario_id, name, description, json.dumps(params), now_ts))
        conn.commit()
        
        before_kpi = get_current_kpi_snapshot(conn)
        return execute_scenario_core(conn, scenario_id, name, description, params, before_kpi)

if __name__ == "__main__":
    res = run_emergency_scenario("SCN_MONSOON")
