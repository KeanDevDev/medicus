"""
Audit Logging Service for Medicus
Tracks all operational data mutations, transfer actions, and ML jobs.
"""

import json
import uuid
import datetime
import sqlite3
from typing import Any, Optional

def record_audit_log(
    conn: sqlite3.Connection,
    user: dict,
    action: str,
    data_type: str,
    previous_value: Any = None,
    new_value: Any = None,
    phc_id: Optional[str] = None,
    ip_address: Optional[str] = None
) -> str:
    """Records an immutable audit trail entry."""
    cursor = conn.cursor()
    log_id = f"AUDIT-{uuid.uuid4().hex[:12].upper()}"
    now_ts = datetime.datetime.now().isoformat()
    
    prev_json = json.dumps(previous_value, default=str) if previous_value is not None else None
    new_json = json.dumps(new_value, default=str) if new_value is not None else None
    
    assigned_phc = phc_id or user.get("phc_id")
    
    cursor.execute("""
        INSERT INTO audit_logs (
            log_id, timestamp, user_id, username, role, phc_id, action,
            data_type, previous_value, new_value, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_id, now_ts, user.get("user_id", "ANONYMOUS"), user.get("username", "anonymous"),
        user.get("role", "unknown"), assigned_phc, action, data_type,
        prev_json, new_json, ip_address
    ))
    conn.commit()
    return log_id
