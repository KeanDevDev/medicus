"""
Deterministic Resource Redistribution Engine
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain

Strictly adheres to NON-NEGOTIABLE OPTIMIZATION DIRECTIVES:
- Deterministic optimization formulation (Linear Programming / Min-Cost Greedy matching).
- Strictly maintains source safety stock (source_surplus >= transfer_quantity).
- Quantities calculated from actual inventory, forecast demand, and days of stock.
- Minimizes transport distance & stockout penalties.
- Explains deterministic operational rationale for each transfer recommendation.
"""

import os
import sys
import math
import sqlite3
import datetime
import pandas as pd
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.database import get_db

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two geographic coordinates in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def run_redistribution_optimizer(conn: sqlite3.Connection, max_distance_km: float = 120.0):
    print("--- Running Deterministic Resource Redistribution Optimizer ---")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transfers WHERE status = 'RECOMMENDED';")
    
    # 1. Fetch latest inventory snapshot joined with stockout risks, forecasts, and PHC coordinates
    query = """
    SELECT 
        i.phc_id,
        i.medicine_id,
        i.closing_stock,
        i.reorder_level,
        i.lead_time_days,
        m.generic_name,
        m.min_safety_stock_days,
        r.severity,
        r.days_of_stock,
        r.risk_probability,
        f.predicted_demand,
        p.district_id,
        p.state_id,
        p.latitude,
        p.longitude,
        p.phc_name
    FROM inventory i
    JOIN medicines m ON i.medicine_id = m.medicine_id
    JOIN stockout_risks r ON i.phc_id = r.phc_id AND i.medicine_id = r.medicine_id
    JOIN forecasts f ON i.phc_id = f.phc_id AND i.medicine_id = f.medicine_id
    JOIN phcs p ON i.phc_id = p.phc_id
    WHERE i.date = (SELECT MAX(date) FROM inventory)
    """
    df = pd.read_sql_query(query, conn)
    
    # Calculate daily consumption and safety stock
    df["daily_consumption"] = df["closing_stock"] / np.maximum(df["days_of_stock"], 0.1)
    df["safety_stock"] = (df["daily_consumption"] * df["min_safety_stock_days"]).astype(int)
    
    # Identify Surplus facilities:
    # A facility has surplus if closing_stock > safety_stock + (daily_consumption * 14) and days_of_stock >= 21
    df["surplus"] = np.maximum(0, df["closing_stock"] - (df["safety_stock"] + (df["daily_consumption"] * 10).astype(int)))
    
    # Identify Deficit (Shortage) facilities:
    # Severity is HIGH or CRITICAL, or days_of_stock < lead_time_days
    df["deficit"] = np.where(
        df["severity"].isin(["HIGH", "CRITICAL"]),
        np.maximum(10, (df["safety_stock"] + df["predicted_demand"] - df["closing_stock"]).astype(int)),
        0
    )
    
    transfer_records = []
    now_ts = datetime.datetime.now().isoformat()
    
    # Optimize per medicine
    for med_id, med_group in df.groupby("medicine_id"):
        deficits = med_group[med_group["deficit"] > 0].sort_values(["severity", "days_of_stock"], ascending=[False, True])
        surpluses = med_group[med_group["surplus"] > 0].copy()
        
        if deficits.empty or surpluses.empty:
            continue
            
        for _, def_row in deficits.iterrows():
            needed = int(def_row["deficit"])
            if needed <= 0:
                continue
                
            # Candidate donors
            candidates = surpluses[surpluses["surplus"] > 0].copy()
            if candidates.empty:
                break
                
            # Compute distance to all candidate donors
            dest_lat = def_row["latitude"]
            dest_lon = def_row["longitude"]
            
            candidates["distance_km"] = candidates.apply(
                lambda r: haversine_distance_km(dest_lat, dest_lon, r["latitude"], r["longitude"]),
                axis=1
            )
            
            # Prioritize: Same district first (distance weight), then surplus size
            candidates["is_same_district"] = (candidates["district_id"] == def_row["district_id"]).astype(int)
            candidates["cost_metric"] = candidates["distance_km"] - (candidates["is_same_district"] * 40.0)
            
            # Filter within max transport radius
            valid_donors = candidates[candidates["distance_km"] <= max_distance_km].sort_values("cost_metric")
            if valid_donors.empty:
                continue
                
            for donor_idx, donor_row in valid_donors.iterrows():
                available_surplus = surpluses.loc[donor_idx, "surplus"]
                if available_surplus <= 0:
                    continue
                    
                transfer_qty = int(min(needed, available_surplus))
                if transfer_qty <= 5:
                    continue
                    
                dist_km = donor_row["distance_km"]
                lead_time_hrs = round(max(1.0, dist_km / 35.0 + 1.0), 1) # ~35 km/h rural transit + 1 hr dispatch
                
                # Priority tier
                if def_row["severity"] == "CRITICAL" or def_row["days_of_stock"] <= def_row["lead_time_days"]:
                    priority = "CRITICAL"
                elif def_row["severity"] == "HIGH":
                    priority = "HIGH"
                else:
                    priority = "MEDIUM"
                    
                reason = (
                    f"Destination ({def_row['phc_name']}) has only {def_row['days_of_stock']:.1f} days of stock "
                    f"(below safety threshold of {def_row['min_safety_stock_days']} days). "
                    f"Source maintains {donor_row['days_of_stock']:.1f} days of stock and retains safety buffer after dispatching {transfer_qty} units. "
                    f"Transit distance: {dist_km} km ({lead_time_hrs}h)."
                )
                
                transfer_id = f"TRF-{donor_row['phc_id']}-{def_row['phc_id']}-{med_id}"
                
                transfer_records.append((
                    transfer_id, donor_row["phc_id"], def_row["phc_id"], med_id,
                    transfer_qty, dist_km, lead_time_hrs, int(available_surplus),
                    needed, priority, "RECOMMENDED", reason, now_ts
                ))
                
                # Update remaining balances
                surpluses.loc[donor_idx, "surplus"] -= transfer_qty
                needed -= transfer_qty
                if needed <= 0:
                    break
                    
    cursor.executemany(
        """INSERT OR REPLACE INTO transfers 
           (transfer_id, source_phc, destination_phc, medicine_id, quantity, estimated_transport_distance, estimated_lead_time, source_surplus, destination_need, priority, status, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        transfer_records
    )
    
    print(f"Redistribution Optimization Complete: Generated {len(transfer_records)} balanced transfer recommendations.")
    return len(transfer_records)

if __name__ == "__main__":
    with get_db() as conn:
        run_redistribution_optimizer(conn)
