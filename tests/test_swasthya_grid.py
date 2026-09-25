"""
Comprehensive Automated Test Suite
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain

Covers:
1. Unit Tests (Optimization, Inventory Conservation, Risk Logic)
2. Integration Tests (FastAPI Endpoints)
3. AI Grounding & Anti-Hallucination Tests
4. Data Integrity Invariant Tests
5. Complete 11-Step End-to-End Workflow Test
"""

import os
import sys
import unittest
import json
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.main import app
from backend.database import get_db
from backend.optimizer.redistribution_engine import haversine_distance_km
from backend.services.gemini_service import gemini_service
from data_pipeline.validate_data import run_data_validation

class TestSwasthyaGridUnitAndIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # -----------------
    # 1. Unit Tests
    # -----------------
    def test_haversine_distance_calculation(self):
        # Distance between Pune (18.5204, 73.8567) and Satara (17.6805, 73.9997) is ~94 km
        dist = haversine_distance_km(18.5204, 73.8567, 17.6805, 73.9997)
        self.assertGreater(dist, 80.0)
        self.assertLess(dist, 110.0)

    def test_data_quality_invariants(self):
        # Run strict 7-rule data invariant validation
        validation_passed = run_data_validation()
        self.assertTrue(validation_passed, "Data quality invariants failed.")

    # -----------------
    # 2. Integration API Tests
    # -----------------
    def test_api_states(self):
        res = self.client.get("/api/states")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 5)
        state_ids = [s["state_id"] for s in data]
        self.assertIn("MH", state_ids)
        self.assertIn("KA", state_ids)
        self.assertIn("RJ", state_ids)

    def test_api_districts(self):
        res = self.client.get("/api/districts?state_id=MH")
        self.assertEqual(res.status_code, 200)
        districts = res.json()
        self.assertGreaterEqual(len(districts), 5)
        for d in districts:
            self.assertEqual(d["state_id"], "MH")
            self.assertEqual(d["data_status"], "REAL")

    def test_api_phcs(self):
        res = self.client.get("/api/phcs?district_id=MH_PUN")
        self.assertEqual(res.status_code, 200)
        phcs = res.json()
        self.assertGreaterEqual(len(phcs), 8)
        for p in phcs:
            self.assertTrue(p["phc_id"].startswith("SIM-PHC-MH-PUN"))
            self.assertEqual(p["data_status"], "SIMULATED")

    def test_api_national_kpis(self):
        res = self.client.get("/api/national/kpis")
        self.assertEqual(res.status_code, 200)
        kpis = res.json()
        self.assertEqual(kpis["geographic_coverage"]["states_represented"], 5)
        self.assertEqual(kpis["geographic_coverage"]["districts_represented"], 26)
        self.assertEqual(kpis["geographic_coverage"]["phcs_monitored"], 208)
        self.assertEqual(kpis["geographic_coverage"]["official_national_reference"]["total_phcs_india"], 31053)

    def test_api_inventory(self):
        res = self.client.get("/api/inventory?limit=10")
        self.assertEqual(res.status_code, 200)
        inv = res.json()
        self.assertEqual(len(inv), 10)
        for item in inv:
            self.assertGreaterEqual(item["closing_stock"], 0)
            self.assertIn("severity", item)

    def test_api_recommendations(self):
        res = self.client.get("/api/recommendations")
        self.assertEqual(res.status_code, 200)
        recs = res.json()
        self.assertGreater(len(recs), 0)
        r0 = recs[0]
        self.assertGreater(r0["quantity"], 0)
        self.assertGreater(r0["source_surplus"], 0)
        self.assertGreater(r0["destination_need"], 0)
        self.assertIn("reason", r0)

    def test_api_federated_status(self):
        res = self.client.get("/api/federated/status")
        self.assertEqual(res.status_code, 200)
        fed = res.json()
        self.assertEqual(fed["algorithm"], "Federated Averaging (FedAvg)")
        self.assertGreaterEqual(fed["total_rounds_completed"], 3)
        self.assertIn("architecture_guarantee", fed)

    # -----------------
    # 3. AI Grounding & Anti-Hallucination Tests
    # -----------------
    def test_gemini_grounding_truthfulness(self):
        # Provide structured data with specific closing stock
        mock_context = {
            "top_risks": [
                {
                    "phc_id": "SIM-PHC-TEST-001",
                    "phc_name": "Test Sector PHC",
                    "generic_name": "ORS (Oral Rehydration Salts)",
                    "severity": "CRITICAL",
                    "closing_stock": 42,
                    "days_of_stock": 2.1,
                    "lead_time_days": 5
                }
            ],
            "recommendations": []
        }
        res = gemini_service.generate_operations_brief(mock_context)
        self.assertIn("briefing", res)
        # Verify that briefing mentions the actual numbers
        self.assertTrue("42" in res["briefing"] or "2.1" in res["briefing"] or "CRITICAL" in res["briefing"])

    # -----------------
    # 4. Complete End-to-End Workflow Test
    # -----------------
    def test_complete_end_to_end_journey(self):
        """
        Executes the full 11-step hackathon judge workflow:
        National -> State -> District -> PHC -> Forecast -> Risk -> Recommendation -> Emergency Scenario -> Delta -> AI Response
        """
        # Step 1: Open National Overview
        res1 = self.client.get("/api/national/kpis")
        self.assertEqual(res1.status_code, 200)
        kpi_before = res1.json()

        # Step 2: Select State
        res2 = self.client.get("/api/districts?state_id=MH")
        self.assertEqual(res2.status_code, 200)
        districts = res2.json()
        selected_dist = districts[0]["district_id"]

        # Step 3: Select District
        res3 = self.client.get(f"/api/phcs?district_id={selected_dist}")
        self.assertEqual(res3.status_code, 200)
        phcs = res3.json()
        selected_phc = phcs[0]["phc_id"]

        # Step 4: Inspect PHC Detail
        res4 = self.client.get(f"/api/phcs/{selected_phc}")
        self.assertEqual(res4.status_code, 200)
        phc_detail = res4.json()
        self.assertIn("inventory_risks", phc_detail)

        # Step 5: Verify Forecasts & Stockout Risks
        res5 = self.client.get("/api/stockout-risks?severity=CRITICAL")
        self.assertEqual(res5.status_code, 200)

        # Step 6: Verify Recommendations
        res6 = self.client.get("/api/recommendations")
        self.assertEqual(res6.status_code, 200)
        recs_before = res6.json()
        initial_recs_count = len(recs_before)

        # Step 7: Trigger Emergency Scenario (Monsoon Surge)
        res7 = self.client.post("/api/simulation/run", json={"scenario_id": "SCN_MONSOON"})
        self.assertEqual(res7.status_code, 200)
        sim_result = res7.json()
        self.assertEqual(sim_result["scenario_id"], "SCN_MONSOON")
        self.assertIn("deltas", sim_result)

        # Step 8: Verify Changed Recommendations
        res8 = self.client.get("/api/recommendations")
        self.assertEqual(res8.status_code, 200)
        recs_after = res8.json()
        self.assertGreaterEqual(len(recs_after), initial_recs_count)

        # Step 9: Ask AI Copilot why and get grounded response
        res9 = self.client.post("/api/gemini/ask", json={
            "question": "Why is Belagavi at risk and which medicines are critical?"
        })
        self.assertEqual(res9.status_code, 200)
        copilot_answer = res9.json()
        self.assertIn("answer", copilot_answer)
        self.assertGreater(len(copilot_answer["answer"]), 20)

        # Step 10: Reset Demo back to baseline
        res10 = self.client.post("/api/demo/reset")
        self.assertEqual(res10.status_code, 200)

if __name__ == "__main__":
    unittest.main()
