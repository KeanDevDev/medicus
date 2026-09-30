"""
Database Connection and Schema Definitions
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain
Relational SQLite implementation fully compliant with Google Cloud / PostgreSQL / BigQuery paradigms.
"""

import os
import json
import sqlite3
from typing import Generator
import contextlib

DB_PATH = os.environ.get("SWASTHYA_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "data", "swasthya_grid.db"))

def ensure_db_migrations(conn: sqlite3.Connection):
    """Ensures newly added tables and columns exist in SQLite across migrations."""
    cursor = conn.cursor()
    
    # 1. stockout_risks migration
    cursor.execute("PRAGMA table_info(stockout_risks)")
    existing_cols = {col[1] for col in cursor.fetchall()}
    if existing_cols:
        if "risk_percent" not in existing_cols:
            cursor.execute("ALTER TABLE stockout_risks ADD COLUMN risk_percent REAL NOT NULL DEFAULT 0.0;")
        if "depletion_horizon" not in existing_cols:
            cursor.execute("ALTER TABLE stockout_risks ADD COLUMN depletion_horizon REAL NOT NULL DEFAULT 0.0;")
        if "risk_factors" not in existing_cols:
            cursor.execute("ALTER TABLE stockout_risks ADD COLUMN risk_factors TEXT;")

    # 2. users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        phc_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (phc_id) REFERENCES phcs(phc_id)
    );
    """)

    # 3. audit_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        phc_id TEXT,
        action TEXT NOT NULL,
        data_type TEXT NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        ip_address TEXT
    );
    """)

    # 4. custom_model_runs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS custom_model_runs (
        run_id TEXT PRIMARY KEY,
        dataset_name TEXT NOT NULL,
        model_type TEXT NOT NULL,
        version TEXT NOT NULL,
        row_count INTEGER NOT NULL,
        status TEXT NOT NULL,
        metrics TEXT NOT NULL,
        feature_importance TEXT,
        confusion_matrix TEXT,
        data_quality_report TEXT,
        predictions_preview TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Indices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_phc_time ON audit_logs(phc_id, timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")
    
    conn.commit()
    seed_users_if_needed(conn)
    seed_emergency_scenarios_if_needed(conn)

def seed_emergency_scenarios_if_needed(conn: sqlite3.Connection):
    """Seeds advanced emergency simulation scenarios if not present."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM emergency_scenarios WHERE scenario_id = 'SCN_HEATWAVE'")
    if cursor.fetchone()[0] == 0:
        import datetime
        now_ts = datetime.datetime.now().isoformat()
        scenarios = [
            (
                "SCN_HEATWAVE",
                "Severe Heatwave & Dehydration Crisis",
                "Extreme peak summer temperatures (>45°C) trigger acute heat exhaustion, severe dehydration, and dialysis/IV fluid surges. Demand for ORS and Normal Saline spikes 2.4x.",
                json.dumps({
                    "demand_factor": 2.2,
                    "disease_factor": 2.8,
                    "lead_time_multiplier": 1.4,
                    "temperature_surge": 8.0,
                    "affected_districts": ["RJ_JAI", "RJ_UDA", "UP_LKO", "UP_VAR", "MH_PUN"]
                }),
                now_ts
            ),
            (
                "SCN_CYCLONE",
                "Super Cyclone Landfall & Coastal Isolation",
                "Severe Category-4 cyclone makes landfall, knocking out primary highway links, rural power grids, and cold-chain storage. Lead times jump 3.5x with severe anti-snake venom and emergency trauma deficits.",
                json.dumps({
                    "demand_factor": 1.9,
                    "disease_factor": 2.4,
                    "lead_time_multiplier": 3.5,
                    "rainfall_surge": 120.0,
                    "affected_districts": ["TN_CHE", "MH_KOL", "MH_SAN"]
                }),
                now_ts
            )
        ]
        cursor.executemany(
            "INSERT OR IGNORE INTO emergency_scenarios (scenario_id, name, description, parameters, created_at) VALUES (?, ?, ?, ?, ?)",
            scenarios
        )
        conn.commit()

def seed_users_if_needed(conn: sqlite3.Connection):
    """Seeds default admin and PHC operator accounts if not present."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    if cursor.fetchone()[0] == 0:
        import datetime, bcrypt
        now_ts = datetime.datetime.now().isoformat()
        admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
        phc_hash = bcrypt.hashpw(b"phc123", bcrypt.gensalt()).decode("utf-8")

        # 1. Admin account
        cursor.execute(
            """INSERT OR IGNORE INTO users (user_id, username, password_hash, full_name, role, phc_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            ("USR-ADMIN-001", "admin", admin_hash, "National Health Administrator", "admin", None, now_ts)
        )

        # 2. PHC Operator accounts for all active PHCs
        cursor.execute("SELECT phc_id, phc_name, district_id FROM phcs")
        phcs = cursor.fetchall()
        user_rows = []
        for p in phcs:
            p_id = p[0]
            p_name = p[1]
            u_id = f"USR-{p_id}"
            user_rows.append((u_id, p_id, phc_hash, f"{p_name} Operator", "phc_operator", p_id, now_ts))

        if user_rows:
            cursor.executemany(
                """INSERT OR IGNORE INTO users (user_id, username, password_hash, full_name, role, phc_id, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                user_rows
            )
        conn.commit()

def ensure_database_ready():
    """Extracts compressed database archive if sqlite file does not exist on disk."""
    db_file = os.path.abspath(DB_PATH)
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    if not os.path.exists(db_file) or os.path.getsize(db_file) == 0:
        zip_file = db_file + ".zip"
        if os.path.exists(zip_file):
            import zipfile
            print(f"[MEDICUS] Extracting initial operational database from {zip_file}...")
            with zipfile.ZipFile(zip_file, "r") as z:
                z.extractall(os.path.dirname(db_file))

def get_db_connection() -> sqlite3.Connection:
    ensure_database_ready()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys and WAL mode for high performance
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    ensure_db_migrations(conn)
    return conn

@contextlib.contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db(drop_existing: bool = False):
    """Initializes the relational database schema according to hackathon specifications."""
    with get_db() as conn:
        cursor = conn.cursor()
        if drop_existing:
            tables = [
                "transfers", "stockout_risks", "forecasts", "inventory", 
                "beds", "staff", "healthcare_demand", "phcs", 
                "medicines", "districts", "states", "emergency_scenarios", 
                "model_registry", "federated_rounds"
            ]
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS {table};")

        # 1. states
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS states (
            state_id TEXT PRIMARY KEY,
            lgd_state_code INTEGER NOT NULL UNIQUE,
            state_name TEXT NOT NULL,
            source TEXT NOT NULL,
            data_status TEXT NOT NULL DEFAULT 'REAL'
        );
        """)

        # 2. districts
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS districts (
            district_id TEXT PRIMARY KEY,
            lgd_district_code INTEGER NOT NULL UNIQUE,
            state_id TEXT NOT NULL,
            district_name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            source TEXT NOT NULL,
            data_status TEXT NOT NULL DEFAULT 'REAL',
            FOREIGN KEY (state_id) REFERENCES states(state_id)
        );
        """)

        # 3. phcs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS phcs (
            phc_id TEXT PRIMARY KEY,
            state_id TEXT NOT NULL,
            district_id TEXT NOT NULL,
            phc_name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            population_served INTEGER NOT NULL,
            bed_capacity INTEGER NOT NULL,
            facility_type TEXT NOT NULL DEFAULT 'PHC',
            data_status TEXT NOT NULL DEFAULT 'SIMULATED',
            FOREIGN KEY (state_id) REFERENCES states(state_id),
            FOREIGN KEY (district_id) REFERENCES districts(district_id)
        );
        """)

        # 4. medicines
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS medicines (
            medicine_id TEXT PRIMARY KEY,
            generic_name TEXT NOT NULL,
            category TEXT NOT NULL,
            dosage_form TEXT NOT NULL,
            unit TEXT NOT NULL,
            essential_medicine BOOLEAN NOT NULL DEFAULT 1,
            shelf_life_days INTEGER NOT NULL,
            min_safety_stock_days INTEGER NOT NULL DEFAULT 14,
            lead_time_days INTEGER NOT NULL DEFAULT 5,
            source TEXT NOT NULL,
            data_status TEXT NOT NULL DEFAULT 'REAL'
        );
        """)

        # 5. healthcare_demand
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS healthcare_demand (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            phc_id TEXT NOT NULL,
            opd_patients INTEGER NOT NULL,
            ipd_patients INTEGER NOT NULL,
            emergency_patients INTEGER NOT NULL,
            disease_index REAL NOT NULL,
            rainfall_mm REAL NOT NULL,
            temperature REAL NOT NULL,
            weather_warning TEXT NOT NULL DEFAULT 'GREEN',
            source_type TEXT NOT NULL DEFAULT 'SIMULATED',
            FOREIGN KEY (phc_id) REFERENCES phcs(phc_id),
            UNIQUE(date, phc_id)
        );
        """)

        # 6. inventory
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            phc_id TEXT NOT NULL,
            medicine_id TEXT NOT NULL,
            opening_stock INTEGER NOT NULL,
            received_quantity INTEGER NOT NULL,
            dispensed_quantity INTEGER NOT NULL,
            damaged_quantity INTEGER NOT NULL DEFAULT 0,
            closing_stock INTEGER NOT NULL,
            reorder_level INTEGER NOT NULL,
            lead_time_days INTEGER NOT NULL,
            expiry_risk TEXT NOT NULL DEFAULT 'LOW',
            data_status TEXT NOT NULL DEFAULT 'SIMULATED',
            FOREIGN KEY (phc_id) REFERENCES phcs(phc_id),
            FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id),
            UNIQUE(date, phc_id, medicine_id)
        );
        """)

        # 7. staff
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            phc_id TEXT NOT NULL,
            doctors_total INTEGER NOT NULL,
            doctors_present INTEGER NOT NULL,
            nurses_total INTEGER NOT NULL,
            nurses_present INTEGER NOT NULL,
            pharmacists_total INTEGER NOT NULL,
            pharmacists_present INTEGER NOT NULL,
            attendance_rate REAL NOT NULL,
            data_status TEXT NOT NULL DEFAULT 'SIMULATED',
            FOREIGN KEY (phc_id) REFERENCES phcs(phc_id),
            UNIQUE(date, phc_id)
        );
        """)

        # 8. beds
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS beds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            phc_id TEXT NOT NULL,
            bed_capacity INTEGER NOT NULL,
            beds_occupied INTEGER NOT NULL,
            beds_available INTEGER NOT NULL,
            occupancy_rate REAL NOT NULL,
            data_status TEXT NOT NULL DEFAULT 'SIMULATED',
            FOREIGN KEY (phc_id) REFERENCES phcs(phc_id),
            UNIQUE(date, phc_id)
        );
        """)

        # 9. forecasts
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS forecasts (
            forecast_id TEXT PRIMARY KEY,
            phc_id TEXT NOT NULL,
            medicine_id TEXT NOT NULL,
            forecast_date TEXT NOT NULL,
            horizon_days INTEGER NOT NULL,
            predicted_demand REAL NOT NULL,
            lower_bound REAL NOT NULL,
            upper_bound REAL NOT NULL,
            model_version TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (phc_id) REFERENCES phcs(phc_id),
            FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
        );
        """)

        # 10. stockout_risks
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS stockout_risks (
            risk_id TEXT PRIMARY KEY,
            phc_id TEXT NOT NULL,
            medicine_id TEXT NOT NULL,
            risk_probability REAL NOT NULL,
            risk_percent REAL NOT NULL DEFAULT 0.0,
            expected_stockout_date TEXT,
            days_of_stock REAL NOT NULL,
            depletion_horizon REAL NOT NULL DEFAULT 0.0,
            severity TEXT NOT NULL,
            risk_factors TEXT,
            model_version TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (phc_id) REFERENCES phcs(phc_id),
            FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
        );
        """)

        # 11. transfers
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transfers (
            transfer_id TEXT PRIMARY KEY,
            source_phc TEXT NOT NULL,
            destination_phc TEXT NOT NULL,
            medicine_id TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            estimated_transport_distance REAL NOT NULL,
            estimated_lead_time REAL NOT NULL,
            source_surplus INTEGER NOT NULL,
            destination_need INTEGER NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'RECOMMENDED',
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (source_phc) REFERENCES phcs(phc_id),
            FOREIGN KEY (destination_phc) REFERENCES phcs(phc_id),
            FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
        );
        """)

        # 12. emergency_scenarios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_scenarios (
            scenario_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            parameters TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """)

        # 13. model_registry
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS model_registry (
            model_id TEXT PRIMARY KEY,
            model_type TEXT NOT NULL,
            version TEXT NOT NULL,
            training_data_version TEXT NOT NULL,
            features TEXT NOT NULL,
            metrics TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """)

        # 14. federated_rounds
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS federated_rounds (
            round_id INTEGER PRIMARY KEY,
            round_number INTEGER NOT NULL,
            participating_states TEXT NOT NULL,
            total_samples INTEGER NOT NULL,
            global_model_version TEXT NOT NULL,
            pre_aggregation_loss REAL NOT NULL,
            post_aggregation_loss REAL NOT NULL,
            global_mae REAL NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
        """)

        # Indices for optimal query latency
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_demand_phc_date ON healthcare_demand(phc_id, date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_inv_phc_med_date ON inventory(phc_id, medicine_id, date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_risks_phc_severity ON stockout_risks(phc_id, severity);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status, priority);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_phcs_district ON phcs(district_id);")

        print("Database schema successfully verified and indexed.")

if __name__ == "__main__":
    init_db(drop_existing=False)
