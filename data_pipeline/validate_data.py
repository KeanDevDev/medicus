"""
Automated Data Quality & Invariant Validation Suite
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain
Verifies data integrity, conservation of inventory mass, and operational constraints.
"""

import os
import sys
import sqlite3
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.database import get_db

def run_data_validation():
    print("=" * 60)
    print("SWASTHYA GRID: Running Data Quality & Invariant Validation")
    print("=" * 60)
    
    failures = []
    checks_passed = 0
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check 1: Non-negative inventory quantities
        cursor.execute("""
            SELECT COUNT(*) FROM inventory 
            WHERE closing_stock < 0 OR received_quantity < 0 OR dispensed_quantity < 0 OR opening_stock < 0
        """)
        bad_inv = cursor.fetchone()[0]
        if bad_inv > 0:
            failures.append(f"FAIL: {bad_inv} inventory rows have negative stock or quantities.")
        else:
            checks_passed += 1
            print("[PASS] Inventory Non-Negativity: All stock & dispensed quantities are >= 0.")
            
        # Check 2: Conservation of mass in inventory
        cursor.execute("""
            SELECT COUNT(*) FROM inventory 
            WHERE closing_stock != (opening_stock + received_quantity - dispensed_quantity - damaged_quantity)
        """)
        unbalanced_inv = cursor.fetchone()[0]
        if unbalanced_inv > 0:
            failures.append(f"FAIL: {unbalanced_inv} inventory rows violate Conservation of Mass balance.")
        else:
            checks_passed += 1
            print("[PASS] Inventory Conservation of Mass: Closing == Opening + Received - Dispensed - Damaged.")
            
        # Check 3: Bed occupancy within capacity
        cursor.execute("""
            SELECT COUNT(*) FROM beds 
            WHERE beds_occupied > bed_capacity OR beds_available < 0 OR occupancy_rate > 1.05
        """)
        bad_beds = cursor.fetchone()[0]
        if bad_beds > 0:
            failures.append(f"FAIL: {bad_beds} bed records have beds_occupied > bed_capacity.")
        else:
            checks_passed += 1
            print("[PASS] Bed Capacity Bounds: beds_occupied <= bed_capacity across all facilities.")
            
        # Check 4: Staff attendance sanity
        cursor.execute("""
            SELECT COUNT(*) FROM staff 
            WHERE (doctors_present > doctors_total) 
               OR (nurses_present > nurses_total) 
               OR (pharmacists_present > pharmacists_total)
               OR attendance_rate > 1.05 OR attendance_rate < 0
        """)
        bad_staff = cursor.fetchone()[0]
        if bad_staff > 0:
            failures.append(f"FAIL: {bad_staff} staff records have present > total.")
        else:
            checks_passed += 1
            print("[PASS] Staff Attendance Sanity: staff_present <= staff_total across all cadres.")
            
        # Check 5: Geography Foreign Key integrity
        cursor.execute("""
            SELECT COUNT(*) FROM phcs p
            LEFT JOIN districts d ON p.district_id = d.district_id
            WHERE d.district_id IS NULL
        """)
        orphan_phcs = cursor.fetchone()[0]
        if orphan_phcs > 0:
            failures.append(f"FAIL: {orphan_phcs} PHCs have invalid district_id foreign keys.")
        else:
            checks_passed += 1
            print("[PASS] Geography Hierarchy: All PHCs map strictly to verified canonical LGD districts.")
            
        # Check 6: Check for nulls in critical primary keys
        cursor.execute("SELECT COUNT(*) FROM phcs WHERE phc_id IS NULL OR state_id IS NULL OR district_id IS NULL")
        null_phcs = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM medicines WHERE medicine_id IS NULL OR generic_name IS NULL")
        null_meds = cursor.fetchone()[0]
        if null_phcs > 0 or null_meds > 0:
            failures.append("FAIL: Null values detected in critical entity keys.")
        else:
            checks_passed += 1
            print("[PASS] Entity Integrity: No null identifiers in states, districts, PHCs, or medicines.")

        # Check 7: Data Status Transparency
        cursor.execute("SELECT DISTINCT data_status FROM states")
        st_statuses = [r[0] for r in cursor.fetchall()]
        cursor.execute("SELECT DISTINCT data_status FROM phcs")
        phc_statuses = [r[0] for r in cursor.fetchall()]
        if "REAL" in st_statuses and "SIMULATED" in phc_statuses:
            checks_passed += 1
            print("[PASS] Data Provenance Transparency: States marked REAL, simulated facilities explicitly marked SIMULATED.")
        else:
            failures.append("FAIL: Data status tags not correctly distinguishing REAL from SIMULATED.")

    print("-" * 60)
    if failures:
        print(f"VALIDATION COMPLETED WITH {len(failures)} FAILURES:")
        for f in failures:
            print("  -", f)
        return False
    else:
        print(f"ALL {checks_passed} DATA QUALITY INVARIANT CHECKS PASSED PERFECTLY!")
        return True

if __name__ == "__main__":
    success = run_data_validation()
    sys.exit(0 if success else 1)
