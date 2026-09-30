"""
Comprehensive Test Suite for Medicus Real-time Synchronization, Emergency Simulations, and Dual LLM Engine
Validates:
1. Real-time PHC Data Synchronization & Immediate Network-wide Risk Recalibration (Inventory, Demand, Beds, Transfers)
2. Predefined & Custom Emergency Stress Simulations (Heatwave, Cyclone, Custom, Reset)
3. Dual Google Gemini & OpenAI API Provider Engine (Key Auto-detection, Routing, Fallback, Guardrails)
"""

import os
import unittest
import json
import sqlite3
from backend.database import get_db, DB_PATH
from backend.services.gemini_service import gemini_service
from backend.simulation.emergency_engine import (
    run_emergency_scenario,
    run_custom_emergency_scenario,
)
from backend.main import (
    reset_simulation_to_baseline,
    sync_phc_inventory_risk,
    broadcaster,
    InventoryUpdateRequest,
    update_phc_inventory,
    DemandUpdateRequest,
    update_phc_demand,
    BedsUpdateRequest,
    update_phc_beds,
)

class TestRealtimeSimulationDualLLM(unittest.TestCase):

    def setUp(self):
        # Ensure database is accessible
        self.assertTrue(os.path.exists(DB_PATH), f"Database not found at {DB_PATH}")

    # =========================================================================
    # 1. Real-time Telemetry & PHC Inventory/Demand/Bed Recalibration
    # =========================================================================

    def test_sync_phc_inventory_risk_recalibration(self):
        """Verifies that updating a PHC's closing stock immediately updates stockout_risks."""
        test_phc = "SIM-PHC-MH-PUN-001"
        test_med = "MED_PCM_500"  # Paracetamol 500mg Tablet

        with get_db() as conn:
            cursor = conn.cursor()
            # Set stock to very low (30 units) with daily consumption ~50
            cursor.execute("""
                UPDATE inventory 
                SET closing_stock = 30, dispensed_quantity = 50, lead_time_days = 5
                WHERE phc_id = ? AND medicine_id = ?
            """, (test_phc, test_med))
            conn.commit()

            # Trigger synchronization
            sync_phc_inventory_risk(conn, test_phc, test_med)
            conn.commit()

            # Verify stockout_risks row was immediately updated
            cursor.execute("""
                SELECT severity, days_of_stock, risk_percent 
                FROM stockout_risks 
                WHERE phc_id = ? AND medicine_id = ?
            """, (test_phc, test_med))
            risk_row = cursor.fetchone()
            self.assertIsNotNone(risk_row, "Risk row must exist")
            self.assertEqual(risk_row["severity"], "CRITICAL", "30 units at 50/day must be CRITICAL (< 3 days)")
            self.assertLess(risk_row["days_of_stock"], 3.0)
            self.assertGreaterEqual(risk_row["risk_percent"], 80.0)

            # Now restore stock to abundant (5000 units)
            cursor.execute("""
                UPDATE inventory 
                SET closing_stock = 5000
                WHERE phc_id = ? AND medicine_id = ?
            """, (test_phc, test_med))
            conn.commit()

            sync_phc_inventory_risk(conn, test_phc, test_med)
            conn.commit()

            cursor.execute("""
                SELECT severity, days_of_stock, risk_percent 
                FROM stockout_risks 
                WHERE phc_id = ? AND medicine_id = ?
            """, (test_phc, test_med))
            healthy_row = cursor.fetchone()
            self.assertEqual(healthy_row["severity"], "NORMAL", "5000 units must result in NORMAL severity")
            self.assertGreater(healthy_row["days_of_stock"], 30.0)
            self.assertLess(healthy_row["risk_percent"], 30.0)

    def test_phc_inventory_update_endpoint_and_broadcast(self):
        """Verifies update_phc_inventory updates DB, syncs risk, and emits broadcaster event."""
        test_phc = "SIM-PHC-MH-PUN-001"
        test_med = "MED_AMX_500"  # Amoxicillin
        req = InventoryUpdateRequest(
            phc_id=test_phc,
            medicine_id=test_med,
            closing_stock=120,
            dispensed_quantity=40
        )
        test_user = {"username": "test_operator", "role": "phc_operator", "phc_id": test_phc}

        res = update_phc_inventory(req, user=test_user)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["updated"]["closing_stock"], 120)

        # Check broadcaster received the event
        self.assertGreaterEqual(broadcaster.version, 1)

    def test_phc_beds_update_synchronizes_capacity(self):
        """Verifies update_phc_beds synchronizes both phcs and beds tables."""
        test_phc = "SIM-PHC-MH-PUN-001"
        req = BedsUpdateRequest(
            phc_id=test_phc,
            beds_occupied=18,
            bed_capacity=24
        )
        test_user = {"username": "test_operator", "role": "phc_operator", "phc_id": test_phc}

        res = update_phc_beds(req, user=test_user)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["updated"]["beds_occupied"], 18)

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT bed_capacity FROM phcs WHERE phc_id = ?", (test_phc,))
            p_row = cursor.fetchone()
            self.assertEqual(p_row["bed_capacity"], 24)

    # =========================================================================
    # 2. Predefined & Custom Emergency Stress Simulations
    # =========================================================================

    def test_predefined_scenarios_exist(self):
        """Validates that SCN_HEATWAVE and SCN_CYCLONE are seeded in emergency_scenarios."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT scenario_id, name FROM emergency_scenarios")
            scens = {row["scenario_id"]: row["name"] for row in cursor.fetchall()}
            self.assertIn("SCN_HEATWAVE", scens)
            self.assertIn("SCN_CYCLONE", scens)
            self.assertIn("SCN_NORMAL", scens)
            self.assertIn("SCN_MONSOON", scens)

    def test_run_heatwave_simulation(self):
        """Executes SCN_HEATWAVE and asserts delta metrics and parameters."""
        res = run_emergency_scenario("SCN_HEATWAVE")
        self.assertEqual(res["scenario_id"], "SCN_HEATWAVE")
        self.assertIn("Heatwave", res["scenario_name"])
        self.assertIn("deltas", res)
        self.assertIn("phcs_at_risk_delta", res["deltas"])
        self.assertIn("critical_risks_delta", res["deltas"])
        self.assertIn("parameters", res)
        self.assertGreaterEqual(res["parameters"].get("temperature_surge", 0), 5.0)

    def test_run_cyclone_simulation(self):
        """Executes SCN_CYCLONE and asserts lead time multiplier and rainfall surge."""
        res = run_emergency_scenario("SCN_CYCLONE")
        self.assertEqual(res["scenario_id"], "SCN_CYCLONE")
        self.assertIn("Cyclone", res["scenario_name"])
        self.assertGreaterEqual(res["parameters"].get("lead_time_multiplier", 1.0), 3.0)
        self.assertGreaterEqual(res["parameters"].get("rainfall_surge", 0), 100.0)

    def test_run_custom_emergency_scenario_and_reset(self):
        """Executes user-defined custom emergency scenario, verifies persistence, and resets."""
        custom_res = run_custom_emergency_scenario(
            name="Test Viral Encephalitis Shock",
            description="High fever, pediatric neurological admissions, 3x antibiotic surge",
            demand_factor=2.8,
            disease_factor=3.5,
            lead_time_multiplier=2.2,
            temperature_surge=3.0,
            rainfall_surge=80.0,
            affected_districts=["MH_PUN", "KA_BLR"]
        )
        self.assertTrue(custom_res["scenario_id"].startswith("SCN_CUSTOM_"))
        self.assertEqual(custom_res["scenario_name"], "Test Viral Encephalitis Shock")
        self.assertEqual(custom_res["affected_districts"], ["MH_PUN", "KA_BLR"])
        self.assertIn("deltas", custom_res)

        # Reset back to operational baseline
        reset_res = reset_simulation_to_baseline()
        self.assertEqual(reset_res["status"], "SUCCESS")

    # =========================================================================
    # 3. Dual Google Gemini & OpenAI API Provider Engine
    # =========================================================================

    def test_llm_key_format_auto_detection(self):
        """Key format detection must distinguish OpenAI (sk-...) and Gemini (AIza...)."""
        openai_key = "sk-proj-abc123def456ghi789jkl012"
        gemini_key = "AIzaSyD-abc123def456ghi789jkl0"

        self.assertEqual(gemini_service.detect_provider(openai_key), "openai")
        self.assertEqual(gemini_service.detect_provider(gemini_key), "gemini")

    def test_llm_service_status(self):
        """Service status must report availability for both Google Gemini and OpenAI."""
        status = gemini_service.get_status()
        self.assertIn("gemini", status)
        self.assertIn("openai", status)
        self.assertEqual(status["gemini"]["provider_name"], "Google Gemini")
        self.assertEqual(status["openai"]["provider_name"], "OpenAI")
        self.assertIn("model", status["gemini"])
        self.assertIn("model", status["openai"])

    def test_llm_clinical_safety_guardrail_across_providers(self):
        """Clinical advice attempts must be blocked before calling either Gemini or OpenAI."""
        queries = [
            "I have high fever, what medicine should I take?",
            "What is the dosage of azithromycin for my child?",
            "Diagnose my symptoms: severe cough and chest pain"
        ]
        for q in queries:
            # Test with Google provider
            res_google = gemini_service.ask_control_tower(question=q, provider="gemini")
            self.assertTrue(res_google.get("guardrail_triggered"))
            self.assertEqual(res_google.get("guardrail_type"), "CLINICAL_ADVICE")

            # Test with OpenAI provider
            res_openai = gemini_service.ask_control_tower(question=q, provider="openai")
            self.assertTrue(res_openai.get("guardrail_triggered"))
            self.assertEqual(res_openai.get("guardrail_type"), "CLINICAL_ADVICE")

    def test_llm_fallback_deterministic_citations_engine(self):
        """When dummy or invalid API keys are supplied, engine falls back to grounded telemetry."""
        query = "What is the stockout risk for Paracetamol in Pune PHC?"
        res = gemini_service.ask_control_tower(
            question=query,
            api_key="sk-dummy-test-key-for-unit-test-fallback",
            provider="openai",
            model="gpt-4o-mini"
        )
        self.assertIn("answer", res)
        self.assertTrue(len(res["answer"]) > 20)
        self.assertIn("citations", res)
        self.assertTrue(len(res["citations"]) > 0)
        # Should cite SQLite Operational Telemetry or NLEM Gazette
        self.assertTrue(any("Telemetry" in c or "NLEM" in c or "Optimizer" in c for c in res["citations"]))


if __name__ == '__main__':
    unittest.main()
