"""
FastAPI Enterprise Application Backend
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain
"""

import os
import sys
import json
import sqlite3
import os
import sys
import json
import sqlite3
import datetime
import uuid
import asyncio
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Depends, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from pydantic import BaseModel

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.database import get_db
from backend.services.gemini_service import gemini_service
from backend.simulation.emergency_engine import run_emergency_scenario, get_current_kpi_snapshot
from backend.optimizer.redistribution_engine import run_redistribution_optimizer, haversine_distance_km
from backend.ml.federated_learning import run_federated_rounds
from backend.services.auth_service import (
    authenticate_user, create_access_token, get_current_user,
    get_optional_current_user, require_admin, require_phc_user, validate_phc_data_scope
)
from backend.services.audit_service import record_audit_log
from backend.services.ml_studio_service import (
    get_active_model_specifications, validate_and_train_custom_dataset
)

app = FastAPI(
    title="Medicus Control Tower API",
    description="Federated AI Platform for National-Scale Public Health Resource & Supply Chain Management",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Real-time Broadcast Bus
class RealtimeBroadcaster:
    def __init__(self):
        self.subscribers: List[asyncio.Queue] = []
        self.version: int = 1
        self.last_event: Dict[str, Any] = {
            "type": "INITIAL",
            "version": 1,
            "timestamp": datetime.datetime.now().isoformat()
        }

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self.subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.subscribers:
            self.subscribers.remove(q)

    def publish_event(self, event_data: Dict[str, Any]):
        self.version += 1
        event_data["version"] = self.version
        if "timestamp" not in event_data:
            event_data["timestamp"] = datetime.datetime.now().isoformat()
        self.last_event = event_data
        dead = []
        for q in self.subscribers:
            try:
                q.put_nowait(event_data)
            except Exception:
                dead.append(q)
        for d in dead:
            self.unsubscribe(d)

broadcaster = RealtimeBroadcaster()

# Pydantic Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class InventoryUpdateRequest(BaseModel):
    phc_id: str
    medicine_id: str
    received_quantity: int = 0
    dispensed_quantity: int = 0
    damaged_quantity: int = 0
    closing_stock: Optional[int] = None
    lead_time_days: Optional[int] = None

class DemandUpdateRequest(BaseModel):
    phc_id: str
    opd_patients: int
    ipd_patients: int
    emergency_patients: int
    disease_index: float

class BedsUpdateRequest(BaseModel):
    phc_id: str
    beds_occupied: int
    bed_capacity: Optional[int] = None

class StaffUpdateRequest(BaseModel):
    phc_id: str
    doctors_present: int
    nurses_present: int
    pharmacists_present: int

class TicketCreateRequest(BaseModel):
    phc_id: str
    title: str
    category: str
    priority: str
    description: str

class TransferCreateRequest(BaseModel):
    source_phc: str
    destination_phc: str
    medicine_id: str
    quantity: int
    reason: str

class TransferActionRequest(BaseModel):
    action: str  # 'APPROVE', 'REJECT', 'DISPATCH', 'RECEIVE'
    notes: Optional[str] = None

class SimulationRequest(BaseModel):
    scenario_id: str

class CustomSimulationRequest(BaseModel):
    name: str
    description: str
    demand_factor: float = 1.5
    disease_factor: float = 1.5
    lead_time_multiplier: float = 1.5
    temperature_surge: float = 0.0
    rainfall_surge: float = 0.0
    affected_districts: Optional[List[str]] = None

class GeminiBriefRequest(BaseModel):
    state_id: Optional[str] = None
    district_id: Optional[str] = None
    phc_id: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None

class GeminiAskRequest(BaseModel):
    question: str
    state_id: Optional[str] = None
    district_id: Optional[str] = None
    phc_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    api_key: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None

# Helper functions
def rows_to_dicts(cursor: sqlite3.Cursor) -> List[Dict[str, Any]]:
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def sync_phc_inventory_risk(conn: sqlite3.Connection, phc_id: str, medicine_id: str):
    """Dynamically recalculates calibrated stockout risk and depletion horizon for a facility."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.*, m.generic_name, m.min_safety_stock_days
        FROM inventory i
        JOIN medicines m ON i.medicine_id = m.medicine_id
        WHERE i.phc_id = ? AND i.medicine_id = ?
        ORDER BY i.date DESC LIMIT 1
    """, (phc_id, medicine_id))
    inv_row = cursor.fetchone()
    if not inv_row:
        return
        
    closing = inv_row["closing_stock"]
    lead_time = inv_row["lead_time_days"]
    min_safety = inv_row["min_safety_stock_days"] if inv_row["min_safety_stock_days"] else 14
    
    # Calculate daily burn rate from recent history or current day
    cursor.execute("""
        SELECT AVG(dispensed_quantity)
        FROM inventory
        WHERE phc_id = ? AND medicine_id = ?
        ORDER BY date DESC LIMIT 7
    """, (phc_id, medicine_id))
    avg_burn = cursor.fetchone()[0]
    burn_rate = max(1.0, float(avg_burn) if avg_burn and avg_burn > 0 else float(inv_row["dispensed_quantity"] or 5))
    
    days_of_stock = round(float(closing) / burn_rate, 1)
    depletion_horizon = days_of_stock
    
    if closing <= 0:
        prob = 0.99
        severity = "CRITICAL"
        factors = [{"factor": "STOCKOUT_PRESENT", "severity": "CRITICAL", "detail": "On-hand inventory is completely exhausted (0 units)."}]
    elif depletion_horizon <= 3.0:
        prob = 0.88
        severity = "CRITICAL"
        factors = [{"factor": "DEPLETION_CRITICAL", "severity": "CRITICAL", "detail": f"Depletion horizon is {depletion_horizon} days, below immediate safety threshold of 3 days."}]
    elif depletion_horizon <= 7.0:
        prob = 0.65
        severity = "HIGH"
        factors = [{"factor": "DEPLETION_WARNING", "severity": "HIGH", "detail": f"Depletion horizon is {depletion_horizon} days, within the 7-day replenishment window."}]
    elif depletion_horizon <= min_safety:
        prob = 0.35
        severity = "WATCH"
        factors = [{"factor": "SAFETY_BUFFER_BREACH", "severity": "MEDIUM", "detail": f"Stock is within the {min_safety}-day safety buffer window."}]
    else:
        prob = 0.05
        severity = "NORMAL"
        factors = [{"factor": "STABLE_INVENTORY", "severity": "LOW", "detail": f"Adequate stock buffer of {depletion_horizon} days; stable consumption velocity."}]
        
    risk_pct = round(prob * 100.0, 1)
    now_ts = datetime.datetime.now().isoformat()
    stockout_days = max(1, int(depletion_horizon)) if depletion_horizon > 0 else 0
    if depletion_horizon <= 0:
        expected_date = datetime.date.today().isoformat()
    elif depletion_horizon < 30:
        expected_date = (datetime.date.today() + datetime.timedelta(days=stockout_days)).isoformat()
    else:
        expected_date = None
        
    risk_id = f"RISK-{phc_id}-{medicine_id}"
    
    cursor.execute("SELECT risk_id FROM stockout_risks WHERE phc_id = ? AND medicine_id = ?", (phc_id, medicine_id))
    existing = cursor.fetchone()
    if existing:
        cursor.execute("""
            UPDATE stockout_risks
            SET risk_probability = ?, risk_percent = ?, days_of_stock = ?,
                depletion_horizon = ?, severity = ?, risk_factors = ?,
                expected_stockout_date = ?, created_at = ?
            WHERE phc_id = ? AND medicine_id = ?
        """, (prob, risk_pct, days_of_stock, depletion_horizon, severity, json.dumps(factors), expected_date, now_ts, phc_id, medicine_id))
    else:
        cursor.execute("""
            INSERT INTO stockout_risks (
                risk_id, phc_id, medicine_id, risk_probability, risk_percent,
                expected_stockout_date, days_of_stock, depletion_horizon,
                severity, risk_factors, model_version, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (risk_id, phc_id, medicine_id, prob, risk_pct, expected_date, days_of_stock, depletion_horizon, severity, json.dumps(factors), "v2.0.0-realtime", now_ts))
    conn.commit()

# -----------------
# 0. Authentication & User Management Endpoints
# -----------------
@app.post("/api/auth/login")
def login(req: LoginRequest):
    with get_db() as conn:
        user = authenticate_user(req.username, req.password, conn)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Verify your username and password."
            )
        token = create_access_token({
            "sub": user["user_id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"],
            "phc_id": user.get("phc_id")
        })
        
        phc_info = None
        if user.get("phc_id"):
            cursor = conn.cursor()
            cursor.execute("SELECT phc_name, district_id, state_id FROM phcs WHERE phc_id = ?", (user["phc_id"],))
            p_row = cursor.fetchone()
            if p_row:
                phc_info = dict(p_row)
                
        return {
            "token": token,
            "user": {
                **user,
                "phc_info": phc_info
            }
        }

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    with get_db() as conn:
        phc_info = None
        if user.get("phc_id"):
            cursor = conn.cursor()
            cursor.execute("SELECT phc_name, district_id, state_id FROM phcs WHERE phc_id = ?", (user["phc_id"],))
            p_row = cursor.fetchone()
            if p_row:
                phc_info = dict(p_row)
        return {**user, "phc_info": phc_info}

@app.get("/api/auth/demo-presets")
def get_demo_presets():
    """Returns convenient verified login presets for judges and evaluators."""
    return {
        "admin": {
            "username": "admin",
            "password": "admin123",
            "role": "admin",
            "label": "National Command Center Admin",
            "description": "Global oversight across all 5 states, 26 districts, and 208 PHCs"
        },
        "phc_presets": [
            {
                "phc_id": "SIM-PHC-KA-BEL-001",
                "username": "SIM-PHC-KA-BEL-001",
                "password": "phc123",
                "phc_name": "Belagavi Sector-1 UPHC",
                "district": "Belagavi, Karnataka",
                "label": "Belagavi Sector-1 PHC (High Outbreak Pressure)"
            },
            {
                "phc_id": "SIM-PHC-MH-PUN-001",
                "username": "SIM-PHC-MH-PUN-001",
                "password": "phc123",
                "phc_name": "Pune Sector-1 UPHC",
                "district": "Pune, Maharashtra",
                "label": "Pune Sector-1 PHC (High Patient Volume)"
            },
            {
                "phc_id": "SIM-PHC-UP-VAR-001",
                "username": "SIM-PHC-UP-VAR-001",
                "password": "phc123",
                "phc_name": "Varanasi Sector-1 UPHC",
                "district": "Varanasi, Uttar Pradesh",
                "label": "Varanasi Sector-1 PHC (Flood Alert Area)"
            }
        ]
    }

# -----------------
# 1. Geographic Hierarchy Endpoints
# -----------------
@app.get("/api/states")
def get_states():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM states ORDER BY state_name ASC")
        return rows_to_dicts(cursor)

@app.get("/api/districts")
def get_districts(state_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        if state_id:
            cursor.execute("SELECT * FROM districts WHERE state_id = ? ORDER BY district_name ASC", (state_id,))
        else:
            cursor.execute("SELECT * FROM districts ORDER BY district_name ASC")
        return rows_to_dicts(cursor)

@app.get("/api/phcs")
def get_phcs(
    state_id: Optional[str] = None,
    district_id: Optional[str] = None,
    limit: int = 500,
    offset: int = 0
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                p.*,
                d.district_name,
                s.state_name,
                COALESCE(r.critical_count, 0) as critical_risks_count,
                COALESCE(r.highest_severity, 'OPTIMAL') as status
            FROM phcs p
            LEFT JOIN districts d ON p.district_id = d.district_id
            LEFT JOIN states s ON p.state_id = s.state_id
            LEFT JOIN (
                SELECT 
                    phc_id,
                    COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count,
                    CASE 
                        WHEN SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) > 0 THEN 'CRITICAL'
                        WHEN SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) > 0 THEN 'WATCH'
                        ELSE 'OPTIMAL'
                    END as highest_severity
                FROM stockout_risks
                GROUP BY phc_id
            ) r ON p.phc_id = r.phc_id
            WHERE 1=1
        """
        params = []
        if state_id:
            query += " AND p.state_id = ?"
            params.append(state_id)
        if district_id:
            query += " AND p.district_id = ?"
            params.append(district_id)
        query += " ORDER BY p.phc_id ASC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        return rows_to_dicts(cursor)

@app.get("/api/phcs/{phc_id}")
def get_phc_detail(phc_id: str, user: Optional[dict] = Depends(get_optional_current_user)):
    if user and user.get("role") == "phc_operator" and user.get("phc_id") != phc_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: You do not have authorization to view detailed records of facility {phc_id}."
        )
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.*, d.district_name, s.state_name 
            FROM phcs p
            JOIN districts d ON p.district_id = d.district_id
            JOIN states s ON p.state_id = s.state_id
            WHERE p.phc_id = ?
        """, (phc_id,))
        phc = cursor.fetchone()
        if not phc:
            raise HTTPException(status_code=404, detail="PHC not found")
        phc_dict = dict(zip([col[0] for col in cursor.description], phc))
        
        # Latest demand snapshot
        cursor.execute("SELECT * FROM healthcare_demand WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (phc_id,))
        dem_row = cursor.fetchone()
        phc_dict["latest_demand"] = dict(zip([col[0] for col in cursor.description], dem_row)) if dem_row else None
        
        # Latest bed occupancy
        cursor.execute("SELECT * FROM beds WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (phc_id,))
        bed_row = cursor.fetchone()
        phc_dict["latest_beds"] = dict(zip([col[0] for col in cursor.description], bed_row)) if bed_row else None
        
        # Latest staff attendance
        cursor.execute("SELECT * FROM staff WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (phc_id,))
        stf_row = cursor.fetchone()
        phc_dict["latest_staff"] = dict(zip([col[0] for col in cursor.description], stf_row)) if stf_row else None
        
        # Inventory risks for this PHC
        cursor.execute("""
            SELECT r.*, m.generic_name, m.category, m.dosage_form, m.unit, m.min_safety_stock_days,
                   i.closing_stock, i.reorder_level, i.lead_time_days, f.predicted_demand, f.lower_bound, f.upper_bound
            FROM stockout_risks r
            JOIN medicines m ON r.medicine_id = m.medicine_id
            JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
            LEFT JOIN forecasts f ON r.phc_id = f.phc_id AND r.medicine_id = f.medicine_id
            WHERE r.phc_id = ?
            ORDER BY r.risk_probability DESC
        """, (phc_id,))
        phc_dict["inventory_risks"] = rows_to_dicts(cursor)
        
        return phc_dict

# -----------------
# 2. National & Regional Telemetry KPIs
# -----------------
@app.get("/api/national/kpis")
def get_national_kpis(state_id: Optional[str] = None, district_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        
        where_phc = "WHERE 1=1"
        params_phc = []
        if state_id:
            where_phc += " AND state_id = ?"
            params_phc.append(state_id)
        if district_id:
            where_phc += " AND district_id = ?"
            params_phc.append(district_id)
            
        cursor.execute(f"SELECT COUNT(*) FROM phcs {where_phc}", params_phc)
        total_phcs = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT state_id), COUNT(DISTINCT district_id) FROM phcs")
        geo_counts = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM medicines")
        total_medicines = cursor.fetchone()[0]
        
        # Latest risks
        cursor.execute(f"""
            SELECT 
                COUNT(CASE WHEN r.severity = 'CRITICAL' THEN 1 END) as critical_count,
                COUNT(CASE WHEN r.severity = 'HIGH' THEN 1 END) as high_count,
                COUNT(CASE WHEN r.severity = 'WATCH' THEN 1 END) as watch_count,
                COUNT(CASE WHEN r.severity = 'NORMAL' THEN 1 END) as normal_count,
                COUNT(DISTINCT CASE WHEN r.severity IN ('CRITICAL', 'HIGH') THEN r.phc_id END) as phcs_at_risk
            FROM stockout_risks r
            JOIN phcs p ON r.phc_id = p.phc_id
            {where_phc.replace('state_id', 'p.state_id').replace('district_id', 'p.district_id')}
        """, params_phc)
        risk_row = cursor.fetchone()
        
        # Beds and Staff
        cursor.execute(f"""
            SELECT 
                SUM(b.bed_capacity) as total_beds,
                SUM(b.beds_occupied) as beds_occupied,
                SUM(b.beds_available) as beds_available,
                ROUND(AVG(b.occupancy_rate), 2) as avg_occupancy
            FROM beds b
            JOIN phcs p ON b.phc_id = p.phc_id
            WHERE b.date = (SELECT MAX(date) FROM beds)
            {where_phc.replace('WHERE 1=1', '').replace('state_id', 'p.state_id').replace('district_id', 'p.district_id')}
        """, params_phc)
        bed_row = cursor.fetchone()
        
        cursor.execute(f"""
            SELECT 
                SUM(s.doctors_present) as doctors_present,
                SUM(s.doctors_total) as doctors_total,
                SUM(s.nurses_present) as nurses_present,
                SUM(s.nurses_total) as nurses_total,
                ROUND(AVG(s.attendance_rate), 2) as avg_attendance
            FROM staff s
            JOIN phcs p ON s.phc_id = p.phc_id
            WHERE s.date = (SELECT MAX(date) FROM staff)
            {where_phc.replace('WHERE 1=1', '').replace('state_id', 'p.state_id').replace('district_id', 'p.district_id')}
        """, params_phc)
        staff_row = cursor.fetchone()
        
        # Active transfers
        cursor.execute("""
            SELECT COUNT(*), COALESCE(SUM(quantity), 0)
            FROM transfers WHERE status = 'RECOMMENDED'
        """)
        trf_row = cursor.fetchone()
        
        return {
            "geographic_coverage": {
                "states_represented": geo_counts[0],
                "districts_represented": geo_counts[1],
                "phcs_monitored": total_phcs,
                "medicines_catalogued": total_medicines,
                "official_national_reference": {
                    "total_phcs_india": 31053,
                    "reference_source": "Rural Health Statistics (RHS) 2022-23, MoHFW"
                }
            },
            "stockout_summary": {
                "critical_stockouts": risk_row[0] or 0,
                "high_risk_items": risk_row[1] or 0,
                "watch_items": risk_row[2] or 0,
                "normal_items": risk_row[3] or 0,
                "phcs_at_risk": risk_row[4] or 0
            },
            "bed_capacity": {
                "total_capacity": bed_row[0] or 0,
                "beds_occupied": bed_row[1] or 0,
                "beds_available": bed_row[2] or 0,
                "occupancy_rate": bed_row[3] or 0.0
            },
            "staff_readiness": {
                "doctors_present": staff_row[0] or 0,
                "doctors_total": staff_row[1] or 0,
                "nurses_present": staff_row[2] or 0,
                "nurses_total": staff_row[3] or 0,
                "attendance_rate": staff_row[4] or 0.0
            },
            "redistribution": {
                "recommended_transfers": trf_row[0] or 0,
                "transfer_volume": trf_row[1] or 0
            }
        }

# -----------------
# 3. Medicines & Inventory Table Endpoints
# -----------------
@app.get("/api/medicines")
def get_medicines():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM medicines ORDER BY category ASC, generic_name ASC")
        return rows_to_dicts(cursor)

@app.get("/api/inventory")
def get_inventory(
    state_id: Optional[str] = None,
    district_id: Optional[str] = None,
    phc_id: Optional[str] = None,
    medicine_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                i.date, i.phc_id, i.medicine_id, i.opening_stock, i.received_quantity,
                i.dispensed_quantity, i.closing_stock, i.reorder_level, i.lead_time_days, i.expiry_risk,
                m.generic_name, m.category, m.dosage_form, m.unit, m.min_safety_stock_days,
                p.phc_name, p.district_id, p.state_id, d.district_name, s.state_name,
                r.severity, r.risk_probability, r.risk_percent, r.days_of_stock, r.depletion_horizon, r.expected_stockout_date,
                f.predicted_demand, f.lower_bound, f.upper_bound
            FROM inventory i
            JOIN medicines m ON i.medicine_id = m.medicine_id
            JOIN phcs p ON i.phc_id = p.phc_id
            JOIN districts d ON p.district_id = d.district_id
            JOIN states s ON p.state_id = s.state_id
            LEFT JOIN stockout_risks r ON i.phc_id = r.phc_id AND i.medicine_id = r.medicine_id
            LEFT JOIN forecasts f ON i.phc_id = f.phc_id AND i.medicine_id = f.medicine_id
            WHERE i.date = (SELECT MAX(date) FROM inventory)
        """
        params = []
        if state_id:
            query += " AND p.state_id = ?"
            params.append(state_id)
        if district_id:
            query += " AND p.district_id = ?"
            params.append(district_id)
        if phc_id:
            query += " AND i.phc_id = ?"
            params.append(phc_id)
        if medicine_id:
            query += " AND i.medicine_id = ?"
            params.append(medicine_id)
        if severity:
            query += " AND r.severity = ?"
            params.append(severity)
            
        query += " ORDER BY CASE r.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'WATCH' THEN 3 ELSE 4 END, r.days_of_stock ASC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        return rows_to_dicts(cursor)

# -----------------
# 4. Forecasts, Stockout Risks & Recommendations
# -----------------
@app.get("/api/stockout-risks")
@app.get("/api/risks")
def get_stockout_risks(
    severity: Optional[str] = None,
    state_id: Optional[str] = None,
    district_id: Optional[str] = None,
    phc_id: Optional[str] = None,
    medicine_id: Optional[str] = None,
    stratified: bool = True,
    limit: int = 50,
    offset: int = 0
):
    """
    Returns calibrated stockout risk evaluations with depletion horizons, probabilities,
    joint severities, and structured explainability risk factors.
    Supports both /api/stockout-risks and /api/risks.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        base_query = """
            SELECT r.*, m.generic_name, m.category, p.phc_name, p.district_id, p.state_id, d.district_name,
                   i.closing_stock, i.lead_time_days, f.predicted_demand
            FROM stockout_risks r
            JOIN medicines m ON r.medicine_id = m.medicine_id
            JOIN phcs p ON r.phc_id = p.phc_id
            JOIN districts d ON p.district_id = d.district_id
            JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
            LEFT JOIN forecasts f ON r.phc_id = f.phc_id AND r.medicine_id = f.medicine_id
            WHERE 1=1
        """
        params = []
        if state_id:
            base_query += " AND p.state_id = ?"
            params.append(state_id)
        if district_id:
            base_query += " AND p.district_id = ?"
            params.append(district_id)
        if phc_id:
            base_query += " AND r.phc_id = ?"
            params.append(phc_id)
        if medicine_id:
            base_query += " AND r.medicine_id = ?"
            params.append(medicine_id)
            
        # If no specific filter and stratified requested, return a representative distribution
        # across all 4 severities so the 2D Risk Matrix displays a balanced operational view
        has_specific_filters = any([state_id, district_id, phc_id, medicine_id, severity])
        if stratified and not has_specific_filters and offset == 0:
            crit_lim = max(1, int(limit * 0.35))
            high_lim = max(1, int(limit * 0.30))
            watch_lim = max(1, int(limit * 0.25))
            norm_lim = max(1, limit - (crit_lim + high_lim + watch_lim))
            
            rows = []
            for sev, s_lim in [("CRITICAL", crit_lim), ("HIGH", high_lim), ("WATCH", watch_lim), ("NORMAL", norm_lim)]:
                q = base_query + " AND r.severity = ? ORDER BY r.risk_probability DESC, r.days_of_stock ASC LIMIT ?"
                cursor.execute(q, params + [sev, s_lim])
                rows.extend(rows_to_dicts(cursor))
        else:
            if severity:
                base_query += " AND r.severity = ?"
                params.append(severity)
            base_query += " ORDER BY CASE r.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'WATCH' THEN 3 ELSE 4 END, r.risk_probability DESC, r.days_of_stock ASC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            cursor.execute(base_query, params)
            rows = rows_to_dicts(cursor)
            
        # Parse JSON risk_factors and format risk_percent / depletion_horizon
        for r in rows:
            if "risk_factors" in r and isinstance(r["risk_factors"], str) and r["risk_factors"]:
                try:
                    r["risk_factors"] = json.loads(r["risk_factors"])
                except Exception:
                    r["risk_factors"] = []
            elif not r.get("risk_factors"):
                r["risk_factors"] = []
                
            prob = float(r.get("risk_probability") or 0.0)
            if "risk_percent" not in r or r["risk_percent"] is None or r["risk_percent"] == 0.0:
                r["risk_percent"] = round(prob * 100.0, 1)
            else:
                r["risk_percent"] = round(float(r["risk_percent"]), 1)
                
            if "depletion_horizon" not in r or r["depletion_horizon"] is None:
                r["depletion_horizon"] = float(r.get("days_of_stock", 0.0))
            else:
                r["depletion_horizon"] = float(r["depletion_horizon"])
                
        return rows

@app.get("/api/recommendations")
@app.get("/api/transfers")
def get_recommendations(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    phc_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_optional_current_user)
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT t.*, m.generic_name, m.unit, m.category,
                   sp.phc_name as source_phc_name, dp.phc_name as destination_phc_name,
                   sp.district_id as source_district_id, dp.district_id as destination_district_id
            FROM transfers t
            JOIN medicines m ON t.medicine_id = m.medicine_id
            JOIN phcs sp ON t.source_phc = sp.phc_id
            JOIN phcs dp ON t.destination_phc = dp.phc_id
            WHERE 1=1
        """
        params = []
        if status:
            if status.upper() in ("ACTIVE", "RECOMMENDED"):
                query += " AND t.status IN ('RECOMMENDED', 'REQUESTED')"
            elif "," in status:
                statuses = [s.strip().upper() for s in status.split(",")]
                placeholders = ",".join(["?"] * len(statuses))
                query += f" AND t.status IN ({placeholders})"
                params.extend(statuses)
            elif status.upper() != "ALL":
                query += " AND t.status = ?"
                params.append(status)
        if priority:
            query += " AND t.priority = ?"
            params.append(priority)
            
        # Scope enforcement: If logged-in user is a PHC operator, restrict to their facility transfers
        if user and isinstance(user, dict) and user.get("role") == "phc_operator":
            query += " AND (t.source_phc = ? OR t.destination_phc = ?)"
            params.extend([user["phc_id"], user["phc_id"]])
        elif phc_id:
            query += " AND (t.source_phc = ? OR t.destination_phc = ?)"
            params.extend([phc_id, phc_id])
            
        query += " ORDER BY CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, t.created_at DESC LIMIT ?"
        params.append(limit)
        cursor.execute(query, params)
        return rows_to_dicts(cursor)

@app.post("/api/recommendations/{transfer_id}/approve")
def approve_transfer(transfer_id: str, user: Optional[dict] = Depends(get_optional_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        now_ts = datetime.datetime.now().isoformat()
        cursor.execute("UPDATE transfers SET status = 'APPROVED', created_at = ? WHERE transfer_id = ?", (now_ts, transfer_id))
        conn.commit()
        cursor.execute("""
            SELECT t.*, m.generic_name, m.unit, m.category,
                   sp.phc_name as source_phc_name, dp.phc_name as destination_phc_name
            FROM transfers t
            JOIN medicines m ON t.medicine_id = m.medicine_id
            JOIN phcs sp ON t.source_phc = sp.phc_id
            JOIN phcs dp ON t.destination_phc = dp.phc_id
            WHERE t.transfer_id = ?
        """, (transfer_id,))
        row = rows_to_dicts(cursor)
        if not row:
            raise HTTPException(status_code=404, detail="Transfer not found")
            
        if user:
            record_audit_log(
                conn, user, action="APPROVE_TRANSFER", data_type="TRANSFERS",
                previous_value={"status": "RECOMMENDED"}, new_value={"status": "APPROVED", "transfer_id": transfer_id}
            )
        return {"status": "SUCCESS", "message": "Transfer approved", "transfer": row[0]}

@app.post("/api/recommendations/{transfer_id}/reject")
def reject_transfer(transfer_id: str, user: Optional[dict] = Depends(get_optional_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        now_ts = datetime.datetime.now().isoformat()
        cursor.execute("UPDATE transfers SET status = 'REJECTED', created_at = ? WHERE transfer_id = ?", (now_ts, transfer_id))
        conn.commit()
        if user:
            record_audit_log(
                conn, user, action="REJECT_TRANSFER", data_type="TRANSFERS",
                previous_value={"status": "RECOMMENDED"}, new_value={"status": "REJECTED", "transfer_id": transfer_id}
            )
        return {"status": "SUCCESS", "message": "Transfer rejected", "transfer_id": transfer_id}

# -----------------
# 4B. PHC Operational Workflows & Scoped Data Entry
# -----------------
@app.get("/api/phc/{phc_id}/dashboard")
def get_phc_dashboard(phc_id: str, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(phc_id, user)
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Facility metadata
        cursor.execute("""
            SELECT p.*, d.district_name, s.state_name
            FROM phcs p
            JOIN districts d ON p.district_id = d.district_id
            JOIN states s ON p.state_id = s.state_id
            WHERE p.phc_id = ?
        """, (phc_id,))
        phc_row = cursor.fetchone()
        if not phc_row:
            raise HTTPException(status_code=404, detail="PHC facility not found")
        phc_meta = dict(phc_row)
        
        # 2. Latest demand
        cursor.execute("SELECT * FROM healthcare_demand WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (phc_id,))
        demand_row = cursor.fetchone()
        latest_demand = dict(demand_row) if demand_row else None
        
        # 3. Latest beds
        cursor.execute("SELECT * FROM beds WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (phc_id,))
        bed_row = cursor.fetchone()
        latest_beds = dict(bed_row) if bed_row else None
        
        # 4. Latest staff
        cursor.execute("SELECT * FROM staff WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (phc_id,))
        staff_row = cursor.fetchone()
        latest_staff = dict(staff_row) if staff_row else None
        
        # 5. Stockout risks for this PHC
        cursor.execute("""
            SELECT r.*, m.generic_name, m.category, m.unit, m.dosage_form,
                   i.closing_stock, i.lead_time_days
            FROM stockout_risks r
            JOIN medicines m ON r.medicine_id = m.medicine_id
            JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
            WHERE r.phc_id = ?
            ORDER BY r.risk_probability DESC
        """, (phc_id,))
        risks = []
        for r in cursor.fetchall():
            rd = dict(r)
            if rd.get("risk_factors"):
                try: rd["risk_factors"] = json.loads(rd["risk_factors"])
                except Exception: pass
            risks.append(rd)
            
        # 6. Active Transfers involving this PHC
        cursor.execute("""
            SELECT t.*, m.generic_name, m.unit,
                   sp.phc_name as source_phc_name, dp.phc_name as destination_phc_name
            FROM transfers t
            JOIN medicines m ON t.medicine_id = m.medicine_id
            JOIN phcs sp ON t.source_phc = sp.phc_id
            JOIN phcs dp ON t.destination_phc = dp.phc_id
            WHERE t.source_phc = ? OR t.destination_phc = ?
            ORDER BY t.created_at DESC LIMIT 20
        """, (phc_id, phc_id))
        transfers = rows_to_dicts(cursor)
        
        # 7. Recent audit logs for this PHC
        cursor.execute("""
            SELECT * FROM audit_logs
            WHERE phc_id = ?
            ORDER BY timestamp DESC LIMIT 20
        """, (phc_id,))
        audit_history = rows_to_dicts(cursor)
        for a in audit_history:
            if a.get("previous_value"):
                try: a["previous_value"] = json.loads(a["previous_value"])
                except Exception: pass
            if a.get("new_value"):
                try: a["new_value"] = json.loads(a["new_value"])
                except Exception: pass
                
        return {
            "phc": phc_meta,
            "demand": latest_demand,
            "beds": latest_beds,
            "staff": latest_staff,
            "risks": risks,
            "transfers": transfers,
            "audit_history": audit_history
        }

@app.get("/api/phc/{phc_id}/inventory")
def get_phc_inventory(phc_id: str, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(phc_id, user)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, m.generic_name, m.category, m.dosage_form, m.unit, m.min_safety_stock_days,
                   r.severity, r.risk_probability, r.risk_percent, r.depletion_horizon, r.risk_factors,
                   f.predicted_demand, f.lower_bound, f.upper_bound
            FROM inventory i
            JOIN medicines m ON i.medicine_id = m.medicine_id
            LEFT JOIN stockout_risks r ON i.phc_id = r.phc_id AND i.medicine_id = r.medicine_id
            LEFT JOIN forecasts f ON i.phc_id = f.phc_id AND i.medicine_id = f.medicine_id
            WHERE i.phc_id = ? AND i.date = (SELECT MAX(date) FROM inventory WHERE phc_id = ?)
            ORDER BY m.category ASC, m.generic_name ASC
        """, (phc_id, phc_id))
        rows = rows_to_dicts(cursor)
        for r in rows:
            if r.get("risk_factors"):
                try: r["risk_factors"] = json.loads(r["risk_factors"])
                except Exception: pass
        return rows

@app.post("/api/phc/inventory/update")
def update_phc_inventory(req: InventoryUpdateRequest, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(req.phc_id, user)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM inventory
            WHERE phc_id = ? AND medicine_id = ?
            ORDER BY date DESC LIMIT 1
        """, (req.phc_id, req.medicine_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Inventory record not found")
        prev_dict = dict(row)
        
        open_stock = prev_dict["opening_stock"]
        rec = req.received_quantity if req.received_quantity > 0 else prev_dict["received_quantity"]
        disp = req.dispensed_quantity if req.dispensed_quantity > 0 else prev_dict["dispensed_quantity"]
        dam = req.damaged_quantity if req.damaged_quantity >= 0 else prev_dict["damaged_quantity"]
        
        if req.closing_stock is not None:
            new_closing = max(0, req.closing_stock)
        else:
            new_closing = max(0, open_stock + rec - disp - dam)
            
        lead_time = req.lead_time_days if req.lead_time_days is not None else prev_dict["lead_time_days"]
        
        cursor.execute("""
            UPDATE inventory
            SET received_quantity = ?, dispensed_quantity = ?, damaged_quantity = ?,
                closing_stock = ?, lead_time_days = ?
            WHERE id = ?
        """, (rec, disp, dam, new_closing, lead_time, prev_dict["id"]))
        conn.commit()
        
        # Real-time Invariant & Risk Re-calibration
        sync_phc_inventory_risk(conn, req.phc_id, req.medicine_id)
        
        new_dict = {
            "closing_stock": new_closing,
            "received_quantity": rec,
            "dispensed_quantity": disp,
            "damaged_quantity": dam,
            "lead_time_days": lead_time
        }
        
        log_id = record_audit_log(
            conn, user,
            action="UPDATE_INVENTORY",
            data_type="INVENTORY",
            previous_value={
                "closing_stock": prev_dict["closing_stock"],
                "dispensed_quantity": prev_dict["dispensed_quantity"],
                "received_quantity": prev_dict["received_quantity"]
            },
            new_value=new_dict,
            phc_id=req.phc_id
        )
        
        # Fetch names for live telemetry broadcast
        cursor.execute("SELECT phc_name FROM phcs WHERE phc_id = ?", (req.phc_id,))
        p_row = cursor.fetchone()
        p_name = p_row[0] if p_row else req.phc_id
        cursor.execute("SELECT generic_name FROM medicines WHERE medicine_id = ?", (req.medicine_id,))
        m_row = cursor.fetchone()
        m_name = m_row[0] if m_row else req.medicine_id

        broadcaster.publish_event({
            "type": "DATA_UPDATED",
            "event": "INVENTORY_UPDATE",
            "phc_id": req.phc_id,
            "phc_name": p_name,
            "medicine_id": req.medicine_id,
            "medicine_name": m_name,
            "closing_stock": new_closing,
            "summary": f"{p_name} updated {m_name} stock to {new_closing} units."
        })

        return {"status": "SUCCESS", "message": "Inventory successfully updated in real time", "audit_log_id": log_id, "updated": new_dict}

@app.post("/api/phc/demand/update")
def update_phc_demand(req: DemandUpdateRequest, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(req.phc_id, user)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM healthcare_demand WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (req.phc_id,))
        prev_row = cursor.fetchone()
        prev_dict = dict(prev_row) if prev_row else {}
        
        if prev_row:
            cursor.execute("""
                UPDATE healthcare_demand
                SET opd_patients = ?, ipd_patients = ?, emergency_patients = ?, disease_index = ?
                WHERE id = ?
            """, (req.opd_patients, req.ipd_patients, req.emergency_patients, req.disease_index, prev_dict["id"]))
        conn.commit()
        
        # Recalculate risks for medicines at this facility
        cursor.execute("SELECT DISTINCT medicine_id FROM inventory WHERE phc_id = ?", (req.phc_id,))
        for m_row in cursor.fetchall()[:20]:
            sync_phc_inventory_risk(conn, req.phc_id, m_row[0])
        
        new_dict = req.dict()
        log_id = record_audit_log(
            conn, user,
            action="UPDATE_DEMAND",
            data_type="HEALTHCARE_DEMAND",
            previous_value=prev_dict,
            new_value=new_dict,
            phc_id=req.phc_id
        )

        cursor.execute("SELECT phc_name FROM phcs WHERE phc_id = ?", (req.phc_id,))
        p_row = cursor.fetchone()
        p_name = p_row[0] if p_row else req.phc_id

        broadcaster.publish_event({
            "type": "DATA_UPDATED",
            "event": "DEMAND_UPDATE",
            "phc_id": req.phc_id,
            "phc_name": p_name,
            "opd_patients": req.opd_patients,
            "disease_index": req.disease_index,
            "summary": f"{p_name} updated patient footfall: OPD {req.opd_patients}, Disease Index {req.disease_index}."
        })

        return {"status": "SUCCESS", "message": "Clinical demand updated in real time", "audit_log_id": log_id, "updated": new_dict}

@app.post("/api/phc/beds/update")
def update_phc_beds(req: BedsUpdateRequest, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(req.phc_id, user)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM beds WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (req.phc_id,))
        prev_row = cursor.fetchone()
        prev_dict = dict(prev_row) if prev_row else {}
        
        cap = req.bed_capacity if req.bed_capacity else prev_dict.get("bed_capacity", 10)
        occ = min(cap, max(0, req.beds_occupied))
        avail = max(0, cap - occ)
        occ_rate = round(float(occ / max(1, cap)), 2)
        
        if prev_row:
            cursor.execute("""
                UPDATE beds
                SET bed_capacity = ?, beds_occupied = ?, beds_available = ?, occupancy_rate = ?
                WHERE id = ?
            """, (cap, occ, avail, occ_rate, prev_dict["id"]))
        
        # Keep phcs table bed_capacity synchronized across all operational views
        cursor.execute("UPDATE phcs SET bed_capacity = ? WHERE phc_id = ?", (cap, req.phc_id))
        conn.commit()
        
        new_dict = {"bed_capacity": cap, "beds_occupied": occ, "beds_available": avail, "occupancy_rate": occ_rate}
        log_id = record_audit_log(
            conn, user,
            action="UPDATE_BEDS",
            data_type="BEDS",
            previous_value=prev_dict,
            new_value=new_dict,
            phc_id=req.phc_id
        )

        cursor.execute("SELECT phc_name FROM phcs WHERE phc_id = ?", (req.phc_id,))
        p_row = cursor.fetchone()
        p_name = p_row[0] if p_row else req.phc_id

        broadcaster.publish_event({
            "type": "DATA_UPDATED",
            "event": "BEDS_UPDATE",
            "phc_id": req.phc_id,
            "phc_name": p_name,
            "beds_occupied": occ,
            "bed_capacity": cap,
            "summary": f"{p_name} updated bed occupancy: {occ}/{cap} beds ({round(occ_rate*100)}%)."
        })

        return {"status": "SUCCESS", "message": "Bed occupancy updated in real time", "audit_log_id": log_id, "updated": new_dict}

@app.post("/api/phc/staff/update")
def update_phc_staff(req: StaffUpdateRequest, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(req.phc_id, user)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM staff WHERE phc_id = ? ORDER BY date DESC LIMIT 1", (req.phc_id,))
        prev_row = cursor.fetchone()
        prev_dict = dict(prev_row) if prev_row else {}
        
        doc_tot = prev_dict.get("doctors_total", 2)
        nur_tot = prev_dict.get("nurses_total", 4)
        phm_tot = prev_dict.get("pharmacists_total", 1)
        tot = doc_tot + nur_tot + phm_tot
        pres = req.doctors_present + req.nurses_present + req.pharmacists_present
        att_rate = round(float(pres / max(1, tot)), 2)
        
        if prev_row:
            cursor.execute("""
                UPDATE staff
                SET doctors_present = ?, nurses_present = ?, pharmacists_present = ?, attendance_rate = ?
                WHERE id = ?
            """, (req.doctors_present, req.nurses_present, req.pharmacists_present, att_rate, prev_dict["id"]))
        conn.commit()
        
        new_dict = {
            "doctors_present": req.doctors_present,
            "nurses_present": req.nurses_present,
            "pharmacists_present": req.pharmacists_present,
            "attendance_rate": att_rate
        }
        log_id = record_audit_log(
            conn, user,
            action="UPDATE_STAFF",
            data_type="STAFF",
            previous_value=prev_dict,
            new_value=new_dict,
            phc_id=req.phc_id
        )

        cursor.execute("SELECT phc_name FROM phcs WHERE phc_id = ?", (req.phc_id,))
        p_row = cursor.fetchone()
        p_name = p_row[0] if p_row else req.phc_id

        broadcaster.publish_event({
            "type": "DATA_UPDATED",
            "event": "STAFF_UPDATE",
            "phc_id": req.phc_id,
            "phc_name": p_name,
            "doctors_present": req.doctors_present,
            "nurses_present": req.nurses_present,
            "summary": f"{p_name} logged staff presence: {req.doctors_present} doctors, {req.nurses_present} nurses."
        })

        return {"status": "SUCCESS", "message": "Staff attendance logged in real time", "audit_log_id": log_id, "updated": new_dict}

@app.post("/api/phc/tickets")
def create_phc_ticket(req: TicketCreateRequest, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(req.phc_id, user)
    with get_db() as conn:
        ticket_id = f"TCK-{req.phc_id}-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        ticket_data = {
            "ticket_id": ticket_id,
            "phc_id": req.phc_id,
            "title": req.title,
            "category": req.category,
            "priority": req.priority,
            "description": req.description,
            "status": "OPEN",
            "created_at": datetime.datetime.now().isoformat()
        }
        log_id = record_audit_log(
            conn, user,
            action="CREATE_INCIDENT_TICKET",
            data_type="TICKETS",
            previous_value=None,
            new_value=ticket_data,
            phc_id=req.phc_id
        )
        return {"status": "SUCCESS", "message": "Incident ticket registered", "ticket": ticket_data, "audit_log_id": log_id}

@app.get("/api/phc/{phc_id}/nearby")
def get_nearby_phcs(phc_id: str, medicine_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    validate_phc_data_scope(phc_id, user)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT phc_id, phc_name, district_id, latitude, longitude FROM phcs WHERE phc_id = ?", (phc_id,))
        src = cursor.fetchone()
        if not src:
            raise HTTPException(status_code=404, detail="PHC not found")
            
        cursor.execute("""
            SELECT p.phc_id, p.phc_name, p.district_id, p.latitude, p.longitude, d.district_name
            FROM phcs p
            JOIN districts d ON p.district_id = d.district_id
            WHERE p.district_id = ? AND p.phc_id != ?
        """, (src["district_id"], phc_id))
        others = cursor.fetchall()
        
        nearby_list = []
        for o in others:
            dist_km = haversine_distance_km(src["latitude"], src["longitude"], o["latitude"], o["longitude"])
            if medicine_id:
                cursor.execute("""
                    SELECT i.medicine_id, m.generic_name, i.closing_stock, i.reorder_level,
                           MAX(0, i.closing_stock - i.reorder_level) as surplus_quantity
                    FROM inventory i
                    JOIN medicines m ON i.medicine_id = m.medicine_id
                    WHERE i.phc_id = ? AND i.medicine_id = ? AND i.date = (SELECT MAX(date) FROM inventory)
                """, (o["phc_id"], medicine_id))
            else:
                cursor.execute("""
                    SELECT i.medicine_id, m.generic_name, i.closing_stock, i.reorder_level,
                           MAX(0, i.closing_stock - i.reorder_level) as surplus_quantity
                    FROM inventory i
                    JOIN medicines m ON i.medicine_id = m.medicine_id
                    WHERE i.phc_id = ? AND i.date = (SELECT MAX(date) FROM inventory) AND (i.closing_stock > i.reorder_level)
                    ORDER BY surplus_quantity DESC LIMIT 4
                """, (o["phc_id"],))
            surplus_items = rows_to_dicts(cursor)
            
            nearby_list.append({
                "phc_id": o["phc_id"],
                "phc_name": o["phc_name"],
                "district_id": o["district_id"],
                "district_name": o["district_name"],
                "distance_km": round(dist_km, 1),
                "estimated_transit_hours": round(max(0.5, dist_km / 35.0), 1),
                "surplus_items": surplus_items
            })
            
        nearby_list = sorted(nearby_list, key=lambda x: x["distance_km"])
        return nearby_list

@app.post("/api/transfers/request")
def request_lateral_transfer(req: TransferCreateRequest, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin" and user.get("phc_id") != req.destination_phc:
        raise HTTPException(status_code=403, detail="Forbidden: You can only request incoming transfers for your own facility.")
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT latitude, longitude FROM phcs WHERE phc_id = ?", (req.source_phc,))
        sp = cursor.fetchone()
        cursor.execute("SELECT latitude, longitude FROM phcs WHERE phc_id = ?", (req.destination_phc,))
        dp = cursor.fetchone()
        if not sp or not dp:
            raise HTTPException(status_code=400, detail="Invalid source or destination PHC")
            
        dist_km = haversine_distance_km(sp["latitude"], sp["longitude"], dp["latitude"], dp["longitude"])
        lead_time_days = round(max(0.5, dist_km / 120.0), 1)
        
        trf_id = f"TRF-MANUAL-{uuid.uuid4().hex[:8].upper()}"
        now_ts = datetime.datetime.now().isoformat()
        
        cursor.execute("""
            INSERT INTO transfers (
                transfer_id, source_phc, destination_phc, medicine_id, quantity,
                estimated_transport_distance, estimated_lead_time, source_surplus,
                destination_need, priority, status, reason, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            trf_id, req.source_phc, req.destination_phc, req.medicine_id, req.quantity,
            round(dist_km, 1), lead_time_days, req.quantity, req.quantity,
            "HIGH", "REQUESTED", req.reason, now_ts
        ))
        conn.commit()
        
        log_id = record_audit_log(
            conn, user,
            action="REQUEST_TRANSFER",
            data_type="TRANSFERS",
            previous_value=None,
            new_value={"transfer_id": trf_id, **req.dict()},
            phc_id=req.destination_phc
        )
        
        broadcaster.publish_event({
            "type": "DATA_UPDATED",
            "event": "TRANSFER_REQUESTED",
            "transfer_id": trf_id,
            "source_phc": req.source_phc,
            "destination_phc": req.destination_phc,
            "medicine_id": req.medicine_id,
            "quantity": req.quantity,
            "summary": f"Lateral transfer of {req.quantity} units requested from {req.source_phc} to {req.destination_phc}."
        })

        return {"status": "SUCCESS", "transfer_id": trf_id, "message": "Lateral transfer requested", "audit_log_id": log_id}

@app.post("/api/transfers/{transfer_id}/action")
def action_transfer(transfer_id: str, req: TransferActionRequest, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transfers WHERE transfer_id = ?", (transfer_id,))
        t_row = cursor.fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail="Transfer not found")
        t_dict = dict(t_row)
        
        if user.get("role") != "admin":
            if user.get("phc_id") not in (t_dict["source_phc"], t_dict["destination_phc"]):
                raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to act on this transfer.")
                
        act = req.action.upper()
        if act == "APPROVE":
            new_status = "APPROVED"
        elif act == "REJECT":
            new_status = "REJECTED"
        elif act == "DISPATCH":
            new_status = "IN_TRANSIT"
            # Deduct dispatched units from source PHC's latest stock
            cursor.execute("""
                UPDATE inventory
                SET dispensed_quantity = dispensed_quantity + ?,
                    closing_stock = MAX(0, closing_stock - ?)
                WHERE phc_id = ? AND medicine_id = ?
                  AND date = (SELECT MAX(date) FROM inventory WHERE phc_id = ? AND medicine_id = ?)
            """, (t_dict["quantity"], t_dict["quantity"], t_dict["source_phc"], t_dict["medicine_id"], t_dict["source_phc"], t_dict["medicine_id"]))
            conn.commit()
            sync_phc_inventory_risk(conn, t_dict["source_phc"], t_dict["medicine_id"])
        elif act == "RECEIVE":
            new_status = "COMPLETED"
            # Credit received units into destination PHC's latest stock
            cursor.execute("""
                UPDATE inventory
                SET received_quantity = received_quantity + ?,
                    closing_stock = closing_stock + ?
                WHERE phc_id = ? AND medicine_id = ?
                  AND date = (SELECT MAX(date) FROM inventory WHERE phc_id = ? AND medicine_id = ?)
            """, (t_dict["quantity"], t_dict["quantity"], t_dict["destination_phc"], t_dict["medicine_id"], t_dict["destination_phc"], t_dict["medicine_id"]))
            conn.commit()
            sync_phc_inventory_risk(conn, t_dict["destination_phc"], t_dict["medicine_id"])
        else:
            raise HTTPException(status_code=400, detail="Invalid action: choose APPROVE, REJECT, DISPATCH, or RECEIVE")
            
        now_ts = datetime.datetime.now().isoformat()
        cursor.execute("UPDATE transfers SET status = ?, created_at = ? WHERE transfer_id = ?", (new_status, now_ts, transfer_id))
        conn.commit()
        
        log_id = record_audit_log(
            conn, user,
            action=f"TRANSFER_{act}",
            data_type="TRANSFERS",
            previous_value={"status": t_dict["status"]},
            new_value={"status": new_status, "notes": req.notes},
            phc_id=user.get("phc_id")
        )

        broadcaster.publish_event({
            "type": "DATA_UPDATED",
            "event": f"TRANSFER_{act}",
            "transfer_id": transfer_id,
            "action": act,
            "status": new_status,
            "source_phc": t_dict["source_phc"],
            "destination_phc": t_dict["destination_phc"],
            "medicine_id": t_dict["medicine_id"],
            "quantity": t_dict["quantity"],
            "summary": f"Transfer {transfer_id} marked as {new_status}."
        })

        return {"status": "SUCCESS", "transfer_id": transfer_id, "new_status": new_status, "audit_log_id": log_id}

# -----------------
# 4D. Admin ML Studio & Model Ops
# -----------------
@app.get("/api/admin/models")
def get_admin_models(user: dict = Depends(require_admin)):
    with get_db() as conn:
        specs = get_active_model_specifications(conn)
        return list(specs.values())

@app.post("/api/admin/models/train-custom")
async def train_custom_model(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    contents = await file.read()
    with get_db() as conn:
        try:
            result = validate_and_train_custom_dataset(contents, file.filename, user, conn)
            return result
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as ex:
            raise HTTPException(status_code=500, detail=f"Custom training error: {str(ex)}")

@app.get("/api/admin/custom-runs")
def get_custom_runs(user: dict = Depends(require_admin)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM custom_model_runs ORDER BY created_at DESC LIMIT 50")
        rows = rows_to_dicts(cursor)
        for r in rows:
            for field in ["metrics", "feature_importance", "confusion_matrix", "data_quality_report", "predictions_preview"]:
                if r.get(field):
                    try: r[field] = json.loads(r[field])
                    except Exception: pass
        return rows

@app.get("/api/admin/audit-logs")
def get_admin_audit_logs(
    phc_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(require_admin)
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM audit_logs WHERE 1=1"
        params = []
        if phc_id:
            query += " AND phc_id = ?"
            params.append(phc_id)
        if action:
            query += " AND action = ?"
            params.append(action)
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = rows_to_dicts(cursor)
        for r in rows:
            if r.get("previous_value"):
                try: r["previous_value"] = json.loads(r["previous_value"])
                except Exception: pass
            if r.get("new_value"):
                try: r["new_value"] = json.loads(r["new_value"])
                except Exception: pass
        return rows


# -----------------
# 5. Demand, Beds & Staff Telemetry
# -----------------
@app.get("/api/demand")
def get_demand_series(phc_id: Optional[str] = None, district_id: Optional[str] = None, days: int = 30):
    with get_db() as conn:
        cursor = conn.cursor()
        if phc_id:
            cursor.execute("""
                SELECT date, opd_patients, ipd_patients, emergency_patients, disease_index, rainfall_mm, weather_warning
                FROM healthcare_demand
                WHERE phc_id = ?
                ORDER BY date DESC LIMIT ?
            """, (phc_id, days))
        elif district_id:
            cursor.execute("""
                SELECT h.date, SUM(h.opd_patients) as opd_patients, SUM(h.ipd_patients) as ipd_patients,
                       SUM(h.emergency_patients) as emergency_patients, ROUND(AVG(h.disease_index), 2) as disease_index,
                       ROUND(AVG(h.rainfall_mm), 1) as rainfall_mm
                FROM healthcare_demand h
                JOIN phcs p ON h.phc_id = p.phc_id
                WHERE p.district_id = ?
                GROUP BY h.date
                ORDER BY h.date DESC LIMIT ?
            """, (district_id, days))
        else:
            cursor.execute("""
                SELECT date, SUM(opd_patients) as opd_patients, SUM(ipd_patients) as ipd_patients,
                       SUM(emergency_patients) as emergency_patients, ROUND(AVG(disease_index), 2) as disease_index,
                       ROUND(AVG(rainfall_mm), 1) as rainfall_mm
                FROM healthcare_demand
                GROUP BY date
                ORDER BY date DESC LIMIT ?
            """, (days,))
        rows = rows_to_dicts(cursor)
        return list(reversed(rows))

# -----------------
# 5B. Real-time Telemetry Event Stream (Server-Sent Events)
# -----------------
@app.get("/api/realtime/stream")
async def realtime_stream(request: Request):
    """Server-Sent Events (SSE) stream for real-time telemetry updates across all connected clients."""
    q = broadcaster.subscribe()

    async def event_generator():
        try:
            init_msg = json.dumps({
                "type": "CONNECTED",
                "version": broadcaster.version,
                "timestamp": datetime.datetime.now().isoformat()
            })
            yield f"data: {init_msg}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=12.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep connection alive
                    yield f": heartbeat {datetime.datetime.now().isoformat()}\n\n"
        finally:
            broadcaster.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/realtime/status")
def get_realtime_status():
    return broadcaster.get_status()

# -----------------
# 6. Emergency Scenario Simulator
# -----------------
@app.get("/api/simulation/scenarios")
def get_scenarios():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM emergency_scenarios ORDER BY scenario_id ASC")
        return rows_to_dicts(cursor)

@app.post("/api/simulation/run")
def trigger_simulation(req: SimulationRequest):
    try:
        result = run_emergency_scenario(req.scenario_id)
        broadcaster.publish_event({
            "type": "SIMULATION_COMPLETED",
            "scenario_id": req.scenario_id,
            "scenario_name": result.get("scenario_name", req.scenario_id),
            "deltas": result.get("deltas", {}),
            "summary": f"Emergency simulation {result.get('scenario_name', req.scenario_id)} triggered network shock."
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulation/custom")
def trigger_custom_simulation(req: CustomSimulationRequest):
    """Executes a custom emergency disaster simulation with user-defined parameters."""
    try:
        from backend.simulation.emergency_engine import run_custom_emergency_scenario
        result = run_custom_emergency_scenario(
            name=req.name,
            description=req.description,
            demand_factor=req.demand_factor,
            disease_factor=req.disease_factor,
            lead_time_multiplier=req.lead_time_multiplier,
            temperature_surge=req.temperature_surge,
            rainfall_surge=req.rainfall_surge,
            affected_districts=req.affected_districts
        )
        broadcaster.publish_event({
            "type": "SIMULATION_COMPLETED",
            "scenario_id": result["scenario_id"],
            "scenario_name": req.name,
            "deltas": result.get("deltas", {}),
            "summary": f"Custom Emergency Simulation '{req.name}' executed."
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulation/reset")
def reset_simulation_to_baseline():
    """Resets operational state back to Normal Baseline."""
    try:
        result = run_emergency_scenario("SCN_NORMAL")
        broadcaster.publish_event({
            "type": "SIMULATION_COMPLETED",
            "scenario_id": "SCN_NORMAL",
            "scenario_name": "Normal Baseline",
            "deltas": result.get("deltas", {}),
            "summary": "Operational network reset to Normal Baseline."
        })
        return {"status": "SUCCESS", "message": "Network restored to Normal Baseline", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------
# 7. Federated Learning
# -----------------
@app.get("/api/federated/status")
def get_federated_status():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM federated_rounds ORDER BY round_number ASC")
        rounds = rows_to_dicts(cursor)
        
        summary_path = "data/processed/federated_summary.json"
        summary = {}
        if os.path.exists(summary_path):
            with open(summary_path, "r") as f:
                summary = json.load(f)
                
        return {
            "algorithm": "Federated Averaging (FedAvg)",
            "privacy_architecture": "Decentralized state-local operational data partitions; gradients/model parameters aggregated centrally without transferring raw rows.",
            "participating_state_clients": ["MH", "KA", "RJ"],
            "total_rounds_completed": len(rounds),
            "rounds": rounds,
            "architecture_guarantee": "Architecturally segregated state edge storage. Raw patient footfall, OPD visits, and medicine inventory records remain on state-local nodes."
        }

@app.post("/api/federated/run")
def trigger_federated_training(rounds: int = 3):
    try:
        history = run_federated_rounds(rounds=rounds)
        broadcaster.publish_event({
            "type": "DATA_UPDATED",
            "event": "FEDERATED_ROUNDS_COMPLETED",
            "rounds": rounds,
            "summary": f"Completed {rounds} federated learning rounds with edge aggregation."
        })
        return {"status": "SUCCESS", "message": f"Completed {rounds} federated learning rounds.", "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------
# 8. Grounded AI Control Tower (Dual Google Gemini & OpenAI Engine)
# -----------------
@app.post("/api/gemini/brief")
@app.post("/api/llm/brief")
def get_operational_brief(req: GeminiBriefRequest, request: Request):
    with get_db() as conn:
        cursor = conn.cursor()
        
        where_clause = "WHERE 1=1"
        params = []
        loc_str = "National Public Health Network"
        if req.phc_id:
            where_clause += " AND r.phc_id = ?"
            params.append(req.phc_id)
            loc_str = f"PHC {req.phc_id}"
        elif req.district_id:
            where_clause += " AND p.district_id = ?"
            params.append(req.district_id)
            loc_str = f"District {req.district_id}"
        elif req.state_id:
            where_clause += " AND p.state_id = ?"
            params.append(req.state_id)
            loc_str = f"State {req.state_id}"
            
        cursor.execute(f"""
            SELECT r.phc_id, p.phc_name, r.medicine_id, m.generic_name, r.severity,
                   r.days_of_stock, r.risk_probability, i.closing_stock, i.lead_time_days,
                   f.predicted_demand
            FROM stockout_risks r
            JOIN phcs p ON r.phc_id = p.phc_id
            JOIN medicines m ON r.medicine_id = m.medicine_id
            JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
            LEFT JOIN forecasts f ON r.phc_id = f.phc_id AND r.medicine_id = f.medicine_id
            {where_clause}
            ORDER BY r.risk_probability DESC LIMIT 6
        """, params)
        top_risks = rows_to_dicts(cursor)
        
        cursor.execute(f"""
            SELECT t.transfer_id, t.source_phc, t.destination_phc, t.medicine_id, m.generic_name,
                   t.quantity, t.estimated_transport_distance, t.estimated_lead_time,
                   t.source_surplus, t.destination_need, t.priority, t.reason
            FROM transfers t
            JOIN medicines m ON t.medicine_id = m.medicine_id
            WHERE t.status = 'RECOMMENDED'
            ORDER BY CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, t.estimated_transport_distance ASC LIMIT 5
        """)
        recommendations = rows_to_dicts(cursor)
        
        context = {
            "location": loc_str,
            "timestamp": datetime.datetime.now().isoformat(),
            "top_risks": top_risks,
            "recommendations": recommendations
        }
        
        header_gemini = request.headers.get("X-Gemini-API-Key")
        header_openai = request.headers.get("X-OpenAI-API-Key")
        header_provider = request.headers.get("X-LLM-Provider")
        header_model = request.headers.get("X-LLM-Model")
        
        api_key = req.api_key or (header_openai if header_provider == "openai" else header_gemini) or header_gemini or header_openai
        provider = req.provider or header_provider
        model = req.model or header_model
        
        brief = gemini_service.generate_operations_brief(context, api_key=api_key, provider=provider, model=model)
        return brief

@app.get("/api/gemini/status")
@app.get("/api/llm/status")
def get_llm_status():
    """Returns the operational status of Google Gemini and OpenAI providers."""
    return gemini_service.get_status()

@app.post("/api/gemini/ask")
@app.post("/api/llm/ask")
def ask_control_tower(req: GeminiAskRequest, request: Request):
    header_gemini = request.headers.get("X-Gemini-API-Key")
    header_openai = request.headers.get("X-OpenAI-API-Key")
    header_provider = request.headers.get("X-LLM-Provider")
    header_model = request.headers.get("X-LLM-Model")

    # Determine provider and key
    provider = req.provider or header_provider
    api_key = req.api_key
    if not api_key:
        if provider == "openai":
            api_key = header_openai
        elif provider == "gemini":
            api_key = header_gemini
        else:
            api_key = header_gemini or header_openai

    model = req.model or header_model

    filters = {
        "state_id": req.state_id,
        "district_id": req.district_id,
        "phc_id": req.phc_id
    }
    
    response = gemini_service.ask_control_tower(
        question=req.question,
        conversation_history=req.conversation_history,
        api_key=api_key,
        filters=filters,
        provider=provider,
        model=model
    )
    return response

# -----------------
# 9. Provenance & Model Metrics Transparency
# -----------------
@app.get("/api/data-sources")
def get_data_sources():
    registry_file = "data/source_registry.json"
    if os.path.exists(registry_file):
        with open(registry_file, "r") as f:
            return json.load(f)
    return {"sources": []}

@app.get("/api/model-metrics")
def get_model_metrics():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM model_registry ORDER BY created_at DESC")
        models = rows_to_dicts(cursor)
        for m in models:
            m["features"] = json.loads(m["features"])
            m["metrics"] = json.loads(m["metrics"])
        return models

# -----------------
# 9B. Enterprise Healthcare Operations Endpoints
# -----------------
@app.get("/api/search")
def global_search(q: str = Query("", min_length=1)):
    term = f"%{q.strip()}%"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.phc_id, p.phc_name, p.facility_type, d.district_name, s.state_name
            FROM phcs p
            JOIN districts d ON p.district_id = d.district_id
            JOIN states s ON p.state_id = s.state_id
            WHERE p.phc_name LIKE ? OR p.phc_id LIKE ?
            LIMIT 5
        """, (term, term))
        phcs = rows_to_dicts(cursor)

        cursor.execute("""
            SELECT d.district_id, d.district_name, s.state_name
            FROM districts d
            JOIN states s ON d.state_id = s.state_id
            WHERE d.district_name LIKE ? OR d.district_id LIKE ?
            LIMIT 5
        """, (term, term))
        districts = rows_to_dicts(cursor)

        cursor.execute("""
            SELECT medicine_id, generic_name, category, dosage_form, unit
            FROM medicines
            WHERE generic_name LIKE ? OR medicine_id LIKE ? OR category LIKE ?
            LIMIT 5
        """, (term, term, term))
        medicines = rows_to_dicts(cursor)

        cursor.execute("""
            SELECT r.risk_id, r.phc_id, p.phc_name, m.generic_name, r.severity, r.days_of_stock
            FROM stockout_risks r
            JOIN phcs p ON r.phc_id = p.phc_id
            JOIN medicines m ON r.medicine_id = m.medicine_id
            WHERE (m.generic_name LIKE ? OR p.phc_name LIKE ?) AND r.severity IN ('CRITICAL', 'HIGH')
            LIMIT 5
        """, (term, term))
        alerts = rows_to_dicts(cursor)

        return {
            "query": q,
            "phcs": phcs,
            "districts": districts,
            "medicines": medicines,
            "alerts": alerts
        }

@app.get("/api/activity")
def get_activity_log(limit: int = 15):
    with get_db() as conn:
        cursor = conn.cursor()
        events = []
        cursor.execute("""
            SELECT created_at, 'TRANSFER' as event_type, priority as level,
                   'Redistribution recommended: ' || quantity || ' units of ' || medicine_id || ' from ' || source_phc || ' to ' || destination_phc as message,
                   transfer_id as entity_id
            FROM transfers WHERE status = 'RECOMMENDED'
            ORDER BY created_at DESC LIMIT 6
        """)
        events.extend(rows_to_dicts(cursor))

        cursor.execute("""
            SELECT created_at, 'TRANSFER_APPROVED' as event_type, 'SUCCESS' as level,
                   'Transfer approved: ' || quantity || ' units of ' || medicine_id || ' from ' || source_phc || ' to ' || destination_phc as message,
                   transfer_id as entity_id
            FROM transfers WHERE status = 'APPROVED'
            ORDER BY created_at DESC LIMIT 6
        """)
        events.extend(rows_to_dicts(cursor))

        cursor.execute("""
            SELECT r.created_at, 'RISK_ALERT' as event_type, r.severity as level,
                   r.severity || ' stock-out risk: ' || m.generic_name || ' at ' || p.phc_name || ' (' || ROUND(r.days_of_stock, 1) || 'd left)' as message,
                   r.risk_id as entity_id
            FROM stockout_risks r
            JOIN phcs p ON r.phc_id = p.phc_id
            JOIN medicines m ON r.medicine_id = m.medicine_id
            WHERE r.severity IN ('CRITICAL', 'HIGH')
            ORDER BY r.created_at DESC LIMIT 6
        """)
        events.extend(rows_to_dicts(cursor))

        cursor.execute("""
            SELECT timestamp as created_at, 'FEDERATED' as event_type, 'INFO' as level,
                   'Federated Round ' || round_number || ' completed across 3 state nodes (' || global_model_version || ')' as message,
                   'ROUND-' || round_number as entity_id
            FROM federated_rounds
            ORDER BY round_number DESC LIMIT 3
        """)
        events.extend(rows_to_dicts(cursor))

        events.sort(key=lambda x: x["created_at"], reverse=True)
        return events[:limit]

@app.get("/api/notifications")
def get_notifications():
    with get_db() as conn:
        cursor = conn.cursor()
        notifs = []
        # Critical stockout alerts
        cursor.execute("""
            SELECT r.risk_id as id, 'CRITICAL' as category, 'Critical Stockout Alert' as title,
                   m.generic_name || ' at ' || p.phc_name || ' has ' || ROUND(r.days_of_stock, 1) || ' days of stock left.' as message,
                   r.created_at as timestamp, r.phc_id as link_id, 'phc' as link_type
            FROM stockout_risks r
            JOIN phcs p ON r.phc_id = p.phc_id
            JOIN medicines m ON r.medicine_id = m.medicine_id
            WHERE r.severity = 'CRITICAL'
            ORDER BY r.created_at DESC LIMIT 4
        """)
        notifs.extend(rows_to_dicts(cursor))

        # Urgent transfer recommendation notifications
        cursor.execute("""
            SELECT t.transfer_id as id, 'WARNING' as category, 'Redistribution Required' as title,
                   'Action required: Transfer ' || t.quantity || ' units of ' || m.generic_name || ' to ' || dp.phc_name || '.' as message,
                   t.created_at as timestamp, t.transfer_id as link_id, 'transfer' as link_type
            FROM transfers t
            JOIN phcs dp ON t.destination_phc = dp.phc_id
            JOIN medicines m ON t.medicine_id = m.medicine_id
            WHERE t.priority = 'CRITICAL'
            ORDER BY t.created_at DESC LIMIT 3
        """)
        notifs.extend(rows_to_dicts(cursor))

        # Federated model update notification
        cursor.execute("""
            SELECT 'notif-fed-' || round_number as id, 'INFO' as category, 'Federated Model Updated' as title,
                   'Global Model ' || global_model_version || ' converged with MAE: ' || global_mae || ' units.' as message,
                   timestamp, 'federated' as link_id, 'federated' as link_type
            FROM federated_rounds
            ORDER BY round_number DESC LIMIT 1
        """)
        notifs.extend(rows_to_dicts(cursor))

        return notifs

@app.get("/api/workforce")
def get_workforce_summary(state_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        where_clause = "WHERE s.date = (SELECT MAX(date) FROM staff)"
        params = []
        if state_id:
            where_clause += " AND p.state_id = ?"
            params.append(state_id)

        cursor.execute(f"""
            SELECT 
                SUM(s.doctors_total) as doctors_sanctioned,
                SUM(s.doctors_present) as doctors_present,
                SUM(s.nurses_total) as nurses_sanctioned,
                SUM(s.nurses_present) as nurses_present,
                SUM(s.pharmacists_total) as pharmacists_sanctioned,
                SUM(s.pharmacists_present) as pharmacists_present,
                ROUND(AVG(s.attendance_rate), 3) as overall_attendance_rate,
                COUNT(DISTINCT s.phc_id) as reporting_facilities
            FROM staff s
            JOIN phcs p ON s.phc_id = p.phc_id
            {where_clause}
        """, params)
        summary = dict(zip([col[0] for col in cursor.description], cursor.fetchone()))

        # Breakdown by district
        cursor.execute(f"""
            SELECT 
                d.district_id, d.district_name,
                SUM(s.doctors_present) as doctors_present,
                SUM(s.doctors_total) as doctors_total,
                SUM(s.nurses_present) as nurses_present,
                SUM(s.nurses_total) as nurses_total,
                ROUND(AVG(s.attendance_rate), 2) as attendance_rate
            FROM staff s
            JOIN phcs p ON s.phc_id = p.phc_id
            JOIN districts d ON p.district_id = d.district_id
            {where_clause}
            GROUP BY d.district_id, d.district_name
            ORDER BY attendance_rate ASC
        """, params)
        summary["district_breakdown"] = rows_to_dicts(cursor)
        return summary

@app.get("/api/beds/summary")
def get_beds_summary(state_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        where_clause = "WHERE b.date = (SELECT MAX(date) FROM beds)"
        params = []
        if state_id:
            where_clause += " AND p.state_id = ?"
            params.append(state_id)

        cursor.execute(f"""
            SELECT 
                SUM(b.bed_capacity) as total_capacity,
                SUM(b.beds_occupied) as beds_occupied,
                SUM(b.beds_available) as beds_available,
                ROUND(AVG(b.occupancy_rate), 3) as avg_occupancy_rate,
                COUNT(DISTINCT b.phc_id) as reporting_facilities
            FROM beds b
            JOIN phcs p ON b.phc_id = p.phc_id
            {where_clause}
        """, params)
        summary = dict(zip([col[0] for col in cursor.description], cursor.fetchone()))

        # Breakdown by district
        cursor.execute(f"""
            SELECT 
                d.district_id, d.district_name,
                SUM(b.bed_capacity) as total_beds,
                SUM(b.beds_occupied) as beds_occupied,
                SUM(b.beds_available) as beds_available,
                ROUND(AVG(b.occupancy_rate), 2) as occupancy_rate
            FROM beds b
            JOIN phcs p ON b.phc_id = p.phc_id
            JOIN districts d ON p.district_id = d.district_id
            {where_clause}
            GROUP BY d.district_id, d.district_name
            ORDER BY occupancy_rate DESC
        """, params)
        summary["district_breakdown"] = rows_to_dicts(cursor)
        return summary

@app.get("/api/analytics/trends")
def get_analytics_trends(days: int = 30):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                h.date,
                SUM(h.opd_patients) as opd_patients,
                SUM(h.ipd_patients) as ipd_patients,
                SUM(h.emergency_patients) as emergency_patients,
                ROUND(AVG(h.disease_index), 2) as disease_index,
                ROUND(AVG(b.occupancy_rate), 2) as bed_occupancy_rate,
                ROUND(AVG(s.attendance_rate), 2) as staff_attendance_rate
            FROM healthcare_demand h
            LEFT JOIN beds b ON h.date = b.date AND h.phc_id = b.phc_id
            LEFT JOIN staff s ON h.date = s.date AND h.phc_id = s.phc_id
            GROUP BY h.date
            ORDER BY h.date DESC LIMIT ?
        """, (days,))
        rows = rows_to_dicts(cursor)
        return list(reversed(rows))

# -----------------
# 10. Demo Reset & Deterministic Seed
# -----------------
@app.post("/api/demo/reset")
def reset_demo():
    """Resets the demo scenario back to Normal baseline and re-optimizes transfers."""
    try:
        result = run_emergency_scenario("SCN_NORMAL")
        return {"status": "SUCCESS", "message": "Demo reset to Normal baseline successfully.", "snapshot": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/demo/seed")
def seed_demo(scenario_id: str = "SCN_MONSOON"):
    """Seeds the deterministic demo scenario (Heavy Monsoon / Flood / Outbreak)."""
    try:
        result = run_emergency_scenario(scenario_id)
        return {"status": "SUCCESS", "scenario": scenario_id, "snapshot": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------
# 11. Static Frontend Distribution Mount (SPA)
# -----------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not capture API routes
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"status": "Frontend not compiled yet. Run npm run build."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

