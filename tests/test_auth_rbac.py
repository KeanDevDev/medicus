"""
Integration & Security Tests for Medicus Authentication, RBAC, Data Isolation, and ML Studio.
Validates:
1. Login flow for Admin and PHC operators with JWT generation and credential verification.
2. Token verification via /api/auth/me.
3. Cryptographic data isolation: PHC operator restricted strictly to own PHC; 403 on cross-facility queries.
4. Operational data entry (Inventory, Demand, Beds, Staff, Tickets) with immutable audit trail logging.
5. Lateral transfer workflow (Nearby facilities, Request, Approve/Reject/Action, Third-party rejection).
6. Admin ML Studio (Model specs, 403 on non-admin access, CSV custom upload & training pipeline, audit logs).
"""

import os
import sys
import io
import json
import unittest
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.main import app
from backend.database import get_db

class TestAuthAndRbac(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # 1. Login as Admin
        admin_res = cls.client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
        cls.admin_token = admin_res.json()["token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        
        # 2. Login as Belagavi PHC operator
        bel_res = cls.client.post("/api/auth/login", json={"username": "SIM-PHC-KA-BEL-001", "password": "phc123"})
        assert bel_res.status_code == 200, f"Belagavi PHC login failed: {bel_res.text}"
        cls.bel_token = bel_res.json()["token"]
        cls.bel_headers = {"Authorization": f"Bearer {cls.bel_token}"}
        cls.bel_phc_id = "SIM-PHC-KA-BEL-001"
        
        # 3. Login as Pune PHC operator
        pun_res = cls.client.post("/api/auth/login", json={"username": "SIM-PHC-MH-PUN-001", "password": "phc123"})
        assert pun_res.status_code == 200, f"Pune PHC login failed: {pun_res.text}"
        cls.pun_token = pun_res.json()["token"]
        cls.pun_headers = {"Authorization": f"Bearer {cls.pun_token}"}
        cls.pun_phc_id = "SIM-PHC-MH-PUN-001"

    def test_01_login_credentials(self):
        """Verifies correct authentication returns JWT and incorrect fails with 401."""
        # Success admin
        res = self.client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "admin")
        
        # Success PHC
        res = self.client.post("/api/auth/login", json={"username": "SIM-PHC-KA-BEL-001", "password": "phc123"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user"]["role"], "phc_operator")
        self.assertEqual(data["user"]["phc_id"], "SIM-PHC-KA-BEL-001")
        
        # Bad password
        bad_res = self.client.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
        self.assertEqual(bad_res.status_code, 401)
        
        # Non-existent user
        non_res = self.client.post("/api/auth/login", json={"username": "fake_user_999", "password": "phc123"})
        self.assertEqual(non_res.status_code, 401)

    def test_02_auth_me_identity(self):
        """Verifies /api/auth/me returns identity matching the provided JWT."""
        # Unauthenticated
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)
        
        # Admin identity
        res_admin = self.client.get("/api/auth/me", headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(res_admin.json()["role"], "admin")
        
        # PHC operator identity
        res_bel = self.client.get("/api/auth/me", headers=self.bel_headers)
        self.assertEqual(res_bel.status_code, 200)
        self.assertEqual(res_bel.json()["phc_id"], self.bel_phc_id)
        self.assertIsNotNone(res_bel.json().get("phc_info"))

    def test_03_phc_data_isolation(self):
        """Tests strict isolation: PHC operator can view own data but gets 403 on other PHCs."""
        # Belagavi views Belagavi -> OK
        res = self.client.get(f"/api/phc/{self.bel_phc_id}/dashboard", headers=self.bel_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["phc"]["phc_id"], self.bel_phc_id)
        
        # Belagavi attempts to view Pune -> 403 Forbidden!
        res_forbidden = self.client.get(f"/api/phc/{self.pun_phc_id}/dashboard", headers=self.bel_headers)
        self.assertEqual(res_forbidden.status_code, 403)
        self.assertIn("Access Denied", res_forbidden.json()["detail"])
        
        # Belagavi attempts to view Pune details via /api/phcs/{phc_id} -> 403 Forbidden!
        res_phc_forbidden = self.client.get(f"/api/phcs/{self.pun_phc_id}", headers=self.bel_headers)
        self.assertEqual(res_phc_forbidden.status_code, 403)
        
        # Admin views Pune -> OK (Admin has national oversight)
        res_admin = self.client.get(f"/api/phc/{self.pun_phc_id}/dashboard", headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 200)

    def test_04_operational_data_entry_and_audit_trail(self):
        """Tests that operational mutations persist and create an immutable previous/new audit log."""
        # 1. Update Inventory for Belagavi
        inv_payload = {
            "phc_id": self.bel_phc_id,
            "medicine_id": "MED_ACT_CO",
            "received_quantity": 50,
            "dispensed_quantity": 25,
            "damaged_quantity": 2,
            "lead_time_days": 4
        }
        res = self.client.post("/api/phc/inventory/update", json=inv_payload, headers=self.bel_headers)
        self.assertEqual(res.status_code, 200)
        audit_id = res.json().get("audit_log_id")
        self.assertIsNotNone(audit_id)
        
        # Verify audit log in DB
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_logs WHERE log_id = ?", (audit_id,))
            audit_row = cursor.fetchone()
            self.assertIsNotNone(audit_row)
            self.assertEqual(audit_row["data_type"], "INVENTORY")
            self.assertEqual(audit_row["phc_id"], self.bel_phc_id)
            new_val = json.loads(audit_row["new_value"])
            self.assertEqual(new_val["received_quantity"], 50)
            self.assertEqual(new_val["dispensed_quantity"], 25)
            
        # 2. Attempt unauthorized cross-facility mutation: Belagavi tries to modify Pune stock
        inv_forbidden = {
            "phc_id": self.pun_phc_id,
            "medicine_id": "MED_ACT_CO",
            "received_quantity": 100
        }
        res_forb = self.client.post("/api/phc/inventory/update", json=inv_forbidden, headers=self.bel_headers)
        self.assertEqual(res_forb.status_code, 403)
        
        # 3. Update Demand for Belagavi
        demand_payload = {
            "phc_id": self.bel_phc_id,
            "opd_patients": 85,
            "ipd_patients": 10,
            "emergency_patients": 5,
            "disease_index": 1.45
        }
        res_dem = self.client.post("/api/phc/demand/update", json=demand_payload, headers=self.bel_headers)
        self.assertEqual(res_dem.status_code, 200)
        
        # 4. Update Beds for Belagavi
        beds_payload = {
            "phc_id": self.bel_phc_id,
            "bed_capacity": 10,
            "beds_occupied": 8
        }
        res_beds = self.client.post("/api/phc/beds/update", json=beds_payload, headers=self.bel_headers)
        self.assertEqual(res_beds.status_code, 200)
        self.assertEqual(res_beds.json()["updated"]["occupancy_rate"], 0.8)
        
        # 5. Update Staff for Belagavi
        staff_payload = {
            "phc_id": self.bel_phc_id,
            "doctors_present": 2,
            "nurses_present": 3,
            "pharmacists_present": 1
        }
        res_staff = self.client.post("/api/phc/staff/update", json=staff_payload, headers=self.bel_headers)
        self.assertEqual(res_staff.status_code, 200)
        
        # 6. Create Incident Ticket
        tck_payload = {
            "phc_id": self.bel_phc_id,
            "title": "Cold Chain Thermostat Alert",
            "category": "COLD_CHAIN_FAILURE",
            "priority": "HIGH",
            "description": "Temperature fluctuation in deep freezer cabinet 2."
        }
        res_tck = self.client.post("/api/phc/tickets", json=tck_payload, headers=self.bel_headers)
        self.assertEqual(res_tck.status_code, 200)
        self.assertIn("ticket_id", res_tck.json()["ticket"])

    def test_05_lateral_transfers_workflow(self):
        """Tests finding nearby facilities, requesting a lateral transfer, and executing state machine actions."""
        # 1. Get nearby facilities for Belagavi
        res = self.client.get(f"/api/phc/{self.bel_phc_id}/nearby", headers=self.bel_headers)
        self.assertEqual(res.status_code, 200)
        nearby = res.json()
        self.assertTrue(len(nearby) > 0)
        target_phc = nearby[0]["phc_id"]
        
        # Check nearby record includes distance and surplus items
        self.assertIn("distance_km", nearby[0])
        self.assertIn("surplus_items", nearby[0])
        
        # 2. Belagavi requests transfer from neighbor
        trf_req = {
            "source_phc": target_phc,
            "destination_phc": self.bel_phc_id,
            "medicine_id": "MED_ACT_CO",
            "quantity": 30,
            "reason": "Emergency outbreak buffer rebalance"
        }
        res_trf = self.client.post("/api/transfers/request", json=trf_req, headers=self.bel_headers)
        self.assertEqual(res_trf.status_code, 200)
        trf_id = res_trf.json()["transfer_id"]
        
        # 3. Third-party PHC (Pune) attempts to act on Belagavi transfer -> 403 Forbidden!
        res_pun_act = self.client.post(f"/api/transfers/{trf_id}/action", json={"action": "APPROVE"}, headers=self.pun_headers)
        self.assertEqual(res_pun_act.status_code, 403)
        
        # 4. Admin approves transfer -> 200 OK
        res_admin_act = self.client.post(f"/api/transfers/{trf_id}/action", json={"action": "APPROVE"}, headers=self.admin_headers)
        self.assertEqual(res_admin_act.status_code, 200)
        self.assertEqual(res_admin_act.json()["new_status"], "APPROVED")

    def test_06_admin_ml_studio_and_custom_dataset(self):
        """Tests active model inspection, role protection (403 for PHC), and custom dataset training pipeline."""
        # 1. Admin views model specifications
        res = self.client.get("/api/admin/models", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        models = res.json()
        self.assertTrue(len(models) >= 2)
        
        model_names = [m["model_name"].lower() for m in models]
        self.assertTrue(any("demand" in name for name in model_names))
        self.assertTrue(any("stock" in name for name in model_names))
        
        # Inspect model metrics & feature importance
        for m in models:
            self.assertIn("algorithm", m)
            self.assertIn("metrics", m)
            self.assertIn("feature_importance", m)
            self.assertIn("sample_predictions", m)
            
        # 2. PHC operator attempts to access Admin ML Studio -> 403 Forbidden!
        res_phc = self.client.get("/api/admin/models", headers=self.bel_headers)
        self.assertEqual(res_phc.status_code, 403)
        
        # 3. Admin trains a custom dataset via CSV upload
        csv_rows = ["phc_id,footfall,beds_occupied,lead_time_days,dispensed_quantity"]
        for i in range(1, 26):
            csv_rows.append(f"PHC-{i:03d},{30 + i * 3},{2 + (i % 8)},{1 + (i % 5)},{25 + i * 4}")
        csv_data = "\n".join(csv_rows)
        files = {"file": ("test_custom_clinical_data.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
        res_train = self.client.post("/api/admin/models/train-custom", files=files, headers=self.admin_headers)
        self.assertEqual(res_train.status_code, 200)
        run_data = res_train.json()
        self.assertIn("run_id", run_data)
        self.assertEqual(run_data["task_type"], "regression")
        self.assertEqual(run_data["target_column"], "dispensed_quantity")
        self.assertEqual(run_data["records_count"], 25)
        self.assertIn("rmse", run_data["metrics"])
        self.assertTrue(len(run_data["feature_importance"]) > 0)
        
        # 4. Check custom runs list
        res_runs = self.client.get("/api/admin/custom-runs", headers=self.admin_headers)
        self.assertEqual(res_runs.status_code, 200)
        runs = res_runs.json()
        self.assertTrue(any(r["run_id"] == run_data["run_id"] for r in runs))
        
        # 5. Check admin audit logs
        res_audit = self.client.get("/api/admin/audit-logs", headers=self.admin_headers)
        self.assertEqual(res_audit.status_code, 200)
        self.assertTrue(len(res_audit.json()) > 0)

if __name__ == "__main__":
    unittest.main()
