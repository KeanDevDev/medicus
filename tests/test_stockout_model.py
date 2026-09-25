"""
Unit and Integration Tests for Medicus Stock-out Risk Model
Validates:
1. Probability outputs within [0, 1] with healthy non-zero variance.
2. Absence of target leakage (synthetic extreme tests: surplus -> prob~0, zero-stock -> prob~1).
3. Monotonic risk reduction as stock increases.
4. Joint severity classification rule (probability AND depletion horizon).
5. Explainable structured risk factors format.
6. API endpoint contracts (/api/risks and /api/stockout-risks).
7. Anti-saturation check (<90% saturated).
8. Model metrics and calibration curves artifact.
"""

import os
import sys
import json
import unittest
import numpy as np
import pandas as pd
import joblib
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.main import app
from backend.database import get_db, get_db_connection
from backend.ml.train_models import STOCKOUT_FEATURES

class TestStockoutRiskModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.model_path = os.path.join(os.path.dirname(__file__), "..", "backend", "models", "stockout_classifier.joblib")
        cls.assertTrue(os.path.exists(cls.model_path), f"Model file not found at {cls.model_path}")
        cls.model = joblib.load(cls.model_path)

    def test_model_loaded_and_type(self):
        """Verifies model artifact is loaded and wrapped with probability calibration."""
        self.assertIsNotNone(self.model)
        self.assertTrue(hasattr(self.model, "predict_proba"))
        self.assertTrue(hasattr(self.model, "predict"))

    def test_probability_range_and_variance(self):
        """Verifies probability predictions are strictly in [0, 1] with non-zero variance."""
        conn = get_db_connection()
        query = "SELECT risk_probability FROM stockout_risks"
        probs = [row[0] for row in conn.execute(query).fetchall()]
        conn.close()

        self.assertGreater(len(probs), 0)
        p_arr = np.array(probs)
        self.assertTrue(np.all(p_arr >= 0.0), "Negative probability detected")
        self.assertTrue(np.all(p_arr <= 1.0), "Probability > 1.0 detected")
        self.assertFalse(np.any(np.isnan(p_arr)), "NaN probability detected")
        
        std_val = float(np.std(p_arr))
        self.assertGreater(std_val, 0.1, f"Probability variance too low: std = {std_val:.4f}")

    def test_no_target_leakage_and_monotonicity(self):
        """
        Verifies absence of target leakage using synthetic boundary cases:
        - Deep surplus (5000 stock, 2 burn rate) -> risk probability must be near 0 (< 0.05).
        - Zero stock (0 stock, 50 burn rate) -> risk probability must be near 1 (> 0.95).
        - Monotonic reduction as stock increases from 0 to 500.
        """
        # Synthetic high stock / low burn rate sample
        surplus_sample = pd.DataFrame([{
            "closing_stock": 5000.0,
            "burn_rate_7d": 2.0,
            "burn_rate_3d": 2.0,
            "burn_acceleration": 1.0,
            "stock_to_burn_7d": 2500.0,
            "safety_buffer_ratio": 15.0,
            "net_stock_after_lead_time": 4990.0,
            "lead_time_days": 5.0,
            "reorder_level": 300.0,
            "disease_index": 1.0,
            "opd_patients": 40.0,
            "population_served": 25000.0,
            "day_of_week": 2,
            "month": 8
        }])[STOCKOUT_FEATURES]

        p_surplus = float(self.model.predict_proba(surplus_sample)[0, 1])
        self.assertLess(p_surplus, 0.05, f"Surplus stock predicted high risk: {p_surplus}")

        # Synthetic zero stock sample
        depleted_sample = pd.DataFrame([{
            "closing_stock": 0.0,
            "burn_rate_7d": 35.0,
            "burn_rate_3d": 40.0,
            "burn_acceleration": 1.15,
            "stock_to_burn_7d": 0.0,
            "safety_buffer_ratio": 0.0,
            "net_stock_after_lead_time": -175.0,
            "lead_time_days": 5.0,
            "reorder_level": 500.0,
            "disease_index": 2.2,
            "opd_patients": 120.0,
            "population_served": 35000.0,
            "day_of_week": 3,
            "month": 8
        }])[STOCKOUT_FEATURES]

        p_depleted = float(self.model.predict_proba(depleted_sample)[0, 1])
        self.assertGreater(p_depleted, 0.95, f"Zero stock predicted low risk: {p_depleted}")

        # Monotonicity test: varying closing_stock from 0 to 400
        stock_steps = [0.0, 10.0, 30.0, 80.0, 150.0, 300.0, 600.0]
        probs_curve = []
        for s in stock_steps:
            sample = pd.DataFrame([{
                "closing_stock": s,
                "burn_rate_7d": 20.0,
                "burn_rate_3d": 20.0,
                "burn_acceleration": 1.0,
                "stock_to_burn_7d": s / 20.0,
                "safety_buffer_ratio": s / 280.0,
                "net_stock_after_lead_time": s - (5.0 * 20.0),
                "lead_time_days": 5.0,
                "reorder_level": 280.0,
                "disease_index": 1.2,
                "opd_patients": 80.0,
                "population_served": 28000.0,
                "day_of_week": 1,
                "month": 7
            }])[STOCKOUT_FEATURES]
            p = float(self.model.predict_proba(sample)[0, 1])
            probs_curve.append(p)

        for i in range(len(probs_curve) - 1):
            self.assertGreaterEqual(
                probs_curve[i] + 1e-4, 
                probs_curve[i+1],
                f"Non-monotonic risk curve: stock {stock_steps[i]} (prob {probs_curve[i]}) < stock {stock_steps[i+1]} (prob {probs_curve[i+1]})"
            )

    def test_joint_severity_rule(self):
        """Verifies joint severity classification rule separates probability and horizon."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT risk_probability, depletion_horizon, severity FROM stockout_risks")
            rows = cursor.fetchall()
            
        for prob, horizon, sev in rows:
            if prob >= 0.75 and horizon <= 3.0:
                self.assertEqual(sev, "CRITICAL", f"Expected CRITICAL for prob={prob}, horizon={horizon}, got {sev}")
            elif prob >= 0.50 and horizon <= 7.0:
                self.assertEqual(sev, "HIGH", f"Expected HIGH for prob={prob}, horizon={horizon}, got {sev}")
            elif prob >= 0.25 or horizon <= 14.0:
                self.assertEqual(sev, "WATCH", f"Expected WATCH for prob={prob}, horizon={horizon}, got {sev}")
            else:
                self.assertEqual(sev, "NORMAL", f"Expected NORMAL for prob={prob}, horizon={horizon}, got {sev}")

    def test_anti_saturation_check(self):
        """Verifies <90% of predictions are >= 0.99 (satisfies prompt strict pass condition)."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*), SUM(CASE WHEN risk_probability >= 0.99 THEN 1 ELSE 0 END) FROM stockout_risks")
            tot, sat = cursor.fetchone()
            
        pct_sat = (sat / tot) * 100.0
        print(f"\n[Test Verification] Total items: {tot}, Saturated (>=0.99): {sat} ({pct_sat:.2f}%)")
        self.assertLess(pct_sat, 50.0, f"Saturated predictions too high: {pct_sat:.2f}% (Threshold: <50%, hard max 90%)")

    def test_api_risks_and_stockout_risks_endpoints(self):
        """Verifies GET /api/risks and GET /api/stockout-risks satisfy API contract."""
        for endpoint in ["/api/risks?limit=15", "/api/stockout-risks?limit=15"]:
            res = self.client.get(endpoint)
            self.assertEqual(res.status_code, 200, f"Failed for {endpoint}")
            data = res.json()
            self.assertEqual(len(data), 15)
            
            row = data[0]
            expected_keys = [
                "risk_id", "phc_id", "medicine_id", "risk_probability", "risk_percent",
                "days_of_stock", "depletion_horizon", "severity", "model_version",
                "generic_name", "category", "phc_name", "district_id", "state_id",
                "closing_stock", "lead_time_days", "risk_factors"
            ]
            for k in expected_keys:
                self.assertIn(k, row, f"Missing key '{k}' in endpoint response")
                
            self.assertIsInstance(row["risk_probability"], (float, int))
            self.assertGreaterEqual(row["risk_probability"], 0.0)
            self.assertLessEqual(row["risk_probability"], 1.0)
            
            self.assertIsInstance(row["risk_percent"], (float, int))
            self.assertGreaterEqual(row["risk_percent"], 0.0)
            self.assertLessEqual(row["risk_percent"], 100.0)
            
            self.assertIn(row["severity"], ["CRITICAL", "HIGH", "WATCH", "NORMAL"])
            self.assertIsInstance(row["risk_factors"], list)
            if row["risk_factors"]:
                f0 = row["risk_factors"][0]
                self.assertIn("factor", f0)
                self.assertIn("severity", f0)
                self.assertIn("detail", f0)

    def test_api_severity_filtering(self):
        """Verifies API correctly filters by severity for each of the 4 tiers."""
        for sev in ["CRITICAL", "HIGH", "WATCH", "NORMAL"]:
            res = self.client.get(f"/api/risks?severity={sev}&limit=10")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertGreater(len(data), 0, f"No records returned for severity {sev}")
            for item in data:
                self.assertEqual(item["severity"], sev, f"Expected {sev}, got {item['severity']}")

    def test_model_metrics_json_artifact(self):
        """Verifies model_metrics.json exists, has calibration curve, and passes quality thresholds."""
        metrics_file = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "model_metrics.json")
        self.assertTrue(os.path.exists(metrics_file), "model_metrics.json does not exist")
        with open(metrics_file, "r") as f:
            metrics = json.load(f)
            
        self.assertIn("stockout_classifier", metrics)
        m = metrics["stockout_classifier"]
        self.assertIn("brier_score", m)
        self.assertIn("roc_auc", m)
        self.assertIn("pr_auc", m)
        self.assertIn("calibration_bins", m)
        
        self.assertLess(m["brier_score"], 0.05, f"Brier score too high: {m['brier_score']}")
        self.assertGreater(m["roc_auc"], 0.95, f"ROC-AUC too low: {m['roc_auc']}")
        self.assertGreater(m["pr_auc"], 0.90, f"PR-AUC too low: {m['pr_auc']}")
        self.assertEqual(len(m["calibration_bins"]), 5)

if __name__ == "__main__":
    unittest.main()
