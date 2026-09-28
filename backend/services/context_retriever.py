"""
Medicus Control Tower: Intelligent Grounded Context Retriever (RAG across SQLite)
Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain

Dynamically analyzes user queries and extracts precise, verified operational telemetry:
- Target medicine stocks, predicted 7-day consumption, days of stock, and depletion horizons
- Primary Health Centre (PHC) bed capacity, beds occupied, doctor & nurse attendance
- Recommended redistribution transfers with donor/recipient pairs, quantities, and transit km
- Emergency disaster scenarios (Heavy Monsoon, Flood Disruption, Acute Outbreak)
- Federated Learning (FedAvg) and ML model performance metrics
"""

import re
import json
import sqlite3
from typing import Dict, Any, List, Optional
from backend.database import get_db

class GroundedContextRetriever:
    """Extracts targeted, verifiable database records matching the user's operational query."""

    @staticmethod
    def _get_medicine_catalog(conn: sqlite3.Connection) -> List[Dict[str, str]]:
        cursor = conn.cursor()
        cursor.execute("SELECT medicine_id, generic_name, category FROM medicines")
        return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def _get_district_catalog(conn: sqlite3.Connection) -> List[Dict[str, str]]:
        cursor = conn.cursor()
        cursor.execute("SELECT district_id, district_name, state_id FROM districts")
        return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def _get_state_catalog(conn: sqlite3.Connection) -> List[Dict[str, str]]:
        cursor = conn.cursor()
        cursor.execute("SELECT state_id, state_name FROM states")
        return [dict(r) for r in cursor.fetchall()]

    def retrieve_context(self, question: str, filters: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Analyzes question entities and pulls grounded telemetry into a structured context bundle."""
        q_lower = question.lower()
        citations = ["SQLite Operational Telemetry"]
        filters = filters or {}
        
        extracted_facts: List[str] = []
        structured_data: Dict[str, Any] = {}

        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Detect Specific Medicine Mentions
            medicines = self._get_medicine_catalog(conn)
            matched_meds = []
            for med in medicines:
                gen_name = med["generic_name"].lower()
                med_id = med["medicine_id"].lower()
                tokens = [t.strip("(),") for t in gen_name.split() if len(t) > 3]
                if any(tok in q_lower for tok in tokens) or med_id in q_lower:
                    matched_meds.append(med)

            if matched_meds:
                citations.append("NLEM 2022 Drug Gazette")
                structured_data["matched_medicines"] = []
                for med in matched_meds[:3]:
                    cursor.execute("""
                        SELECT r.phc_id, p.phc_name, p.district_id, r.severity, r.days_of_stock,
                               r.risk_probability, i.closing_stock, i.lead_time_days, f.predicted_demand
                        FROM stockout_risks r
                        JOIN phcs p ON r.phc_id = p.phc_id
                        JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
                        LEFT JOIN forecasts f ON r.phc_id = f.phc_id AND r.medicine_id = f.medicine_id
                        WHERE r.medicine_id = ?
                        ORDER BY r.days_of_stock ASC LIMIT 4
                    """, (med["medicine_id"],))
                    med_risks = [dict(r) for r in cursor.fetchall()]
                    
                    # Also check pending transfers for this medicine
                    cursor.execute("""
                        SELECT transfer_id, source_phc, destination_phc, quantity, estimated_transport_distance, estimated_lead_time, priority
                        FROM transfers
                        WHERE medicine_id = ? AND status = 'RECOMMENDED'
                        ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END LIMIT 3
                    """, (med["medicine_id"],))
                    med_transfers = [dict(r) for r in cursor.fetchall()]

                    structured_data["matched_medicines"].append({
                        "medicine": med["generic_name"],
                        "category": med["category"],
                        "critical_facilities": med_risks,
                        "pending_transfers": med_transfers
                    })

                    for r in med_risks[:3]:
                        demand_str = f"{r['predicted_demand']:.0f}" if r.get('predicted_demand') is not None else "N/A"
                        extracted_facts.append(
                            f"Medicine {med['generic_name']} at {r['phc_name']} ({r['phc_id']}): "
                            f"Closing stock is {r['closing_stock']} units ({r['days_of_stock']:.1f} days of stock remaining). "
                            f"Severity: {r['severity']} (Risk: {r['risk_probability']*100:.1f}%). "
                            f"Lead time: {r['lead_time_days']} days. 7-Day Forecast Demand: {demand_str} units."
                        )

            # 2. Detect Specific Location / PHC / District / State Mentions
            districts = self._get_district_catalog(conn)
            states = self._get_state_catalog(conn)
            
            matched_districts = [d for d in districts if d["district_name"].lower() in q_lower or d["district_id"].lower() in q_lower]
            matched_states = [s for s in states if s["state_name"].lower() in q_lower or s["state_id"].lower() in q_lower]

            target_phc_id = filters.get("phc_id")
            phc_match = re.search(r"SIM-PHC-[A-Z0-9\-]+", question, re.IGNORECASE)
            if phc_match:
                target_phc_id = phc_match.group(0).upper()

            # If question mentions city/town name like "Belagavi" or "Pune", also check if there is a PHC matching that
            if not target_phc_id and any(term in q_lower for term in ["belagavi", "hubli", "pune", "sector-1", "central"]):
                cursor.execute("""
                    SELECT phc_id FROM phcs
                    WHERE phc_name LIKE ? OR phc_id LIKE ? LIMIT 1
                """, (f"%{q_lower.split()[0]}%", f"%{q_lower.split()[0]}%"))
                m = cursor.fetchone()
                if m:
                    target_phc_id = m[0]

            if target_phc_id:
                citations.append("Primary Health Centre Telemetry")
                cursor.execute("""
                    SELECT p.phc_id, p.phc_name, p.state_id, p.district_id, p.population_served, p.bed_capacity,
                           b.bed_capacity as total_beds, b.beds_occupied, b.beds_available, b.occupancy_rate,
                           s.doctors_total, s.doctors_present, s.nurses_total, s.nurses_present
                    FROM phcs p
                    LEFT JOIN beds b ON p.phc_id = b.phc_id AND b.date = (SELECT MAX(date) FROM beds)
                    LEFT JOIN staff s ON p.phc_id = s.phc_id AND s.date = (SELECT MAX(date) FROM staff)
                    WHERE p.phc_id = ?
                """, (target_phc_id,))
                phc_row = cursor.fetchone()
                if phc_row:
                    phc_dict = dict(phc_row)
                    structured_data["target_phc"] = phc_dict
                    occ_pct = (phc_dict.get('occupancy_rate') or 0) * 100
                    extracted_facts.append(
                        f"Facility {phc_dict['phc_name']} ({phc_dict['phc_id']}): "
                        f"Population served: {phc_dict['population_served']:,}. Bed Capacity: {phc_dict['bed_capacity']}. "
                        f"Beds Occupied: {phc_dict.get('beds_occupied', 'N/A')}/{phc_dict.get('total_beds', 'N/A')} ({occ_pct:.1f}%). "
                        f"Doctors on duty: {phc_dict.get('doctors_present', 'N/A')}/{phc_dict.get('doctors_total', 'N/A')}. "
                        f"Nurses on duty: {phc_dict.get('nurses_present', 'N/A')}/{phc_dict.get('nurses_total', 'N/A')}."
                    )
                    
                    # Critical inventory for this PHC
                    cursor.execute("""
                        SELECT m.generic_name, r.severity, r.days_of_stock, i.closing_stock
                        FROM stockout_risks r
                        JOIN medicines m ON r.medicine_id = m.medicine_id
                        JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
                        WHERE r.phc_id = ?
                        ORDER BY r.days_of_stock ASC LIMIT 4
                    """, (target_phc_id,))
                    phc_meds = [dict(r) for r in cursor.fetchall()]
                    for pm in phc_meds:
                        extracted_facts.append(
                            f"  - Item: {pm['generic_name']} | Stock: {pm['closing_stock']} units | {pm['days_of_stock']:.1f} days left | Severity: {pm['severity']}"
                        )

            elif matched_districts:
                dist = matched_districts[0]
                citations.append("LGD Canonical District Registry")
                cursor.execute("""
                    SELECT COUNT(p.phc_id) as phc_count, SUM(p.population_served) as total_pop,
                           AVG(b.occupancy_rate) as avg_occ, SUM(b.beds_occupied) as occ_beds, SUM(b.bed_capacity) as tot_beds
                    FROM phcs p
                    LEFT JOIN beds b ON p.phc_id = b.phc_id AND b.date = (SELECT MAX(date) FROM beds)
                    WHERE p.district_id = ?
                """, (dist["district_id"],))
                dist_summary = dict(cursor.fetchone())
                extracted_facts.append(
                    f"District {dist['district_name']} ({dist['state_id']}): "
                    f"Monitors {dist_summary['phc_count']} PHCs covering {dist_summary['total_pop']:,} population. "
                    f"Bed Occupancy: {dist_summary['occ_beds']}/{dist_summary['tot_beds']} (Avg rate: {(dist_summary.get('avg_occ') or 0)*100:.1f}%)."
                )

                # Top risks in this district
                cursor.execute("""
                    SELECT p.phc_name, m.generic_name, r.severity, r.days_of_stock, i.closing_stock
                    FROM stockout_risks r
                    JOIN phcs p ON r.phc_id = p.phc_id
                    JOIN medicines m ON r.medicine_id = m.medicine_id
                    JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
                    WHERE p.district_id = ?
                    ORDER BY r.risk_probability DESC LIMIT 4
                """, (dist["district_id"],))
                dist_risks = [dict(r) for r in cursor.fetchall()]
                for dr in dist_risks:
                    extracted_facts.append(
                        f"  - Risk in {dr['phc_name']}: {dr['generic_name']} at {dr['severity']} risk ({dr['days_of_stock']:.1f} days left, {dr['closing_stock']} units)."
                    )

            # 3. Detect Operational / Transfer / Redistribution Questions
            if any(k in q_lower for k in ["transfer", "redistribut", "move", "donor", "recipient", "transit", "truck"]):
                citations.append("Deterministic Redistribution Optimizer")
                cursor.execute("""
                    SELECT t.transfer_id, t.source_phc, sp.phc_name as source_name,
                           t.destination_phc, dp.phc_name as dest_name,
                           m.generic_name, t.quantity, t.estimated_transport_distance,
                           t.estimated_lead_time, t.priority, t.reason
                    FROM transfers t
                    JOIN phcs sp ON t.source_phc = sp.phc_id
                    JOIN phcs dp ON t.destination_phc = dp.phc_id
                    JOIN medicines m ON t.medicine_id = m.medicine_id
                    WHERE t.status = 'RECOMMENDED'
                    ORDER BY CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, t.estimated_transport_distance ASC
                    LIMIT 4
                """)
                top_transfers = [dict(r) for r in cursor.fetchall()]
                structured_data["recommended_transfers"] = top_transfers
                for t in top_transfers:
                    extracted_facts.append(
                        f"Recommended Transfer [{t['priority']}]: Move {t['quantity']} units of {t['generic_name']} "
                        f"from {t['source_name']} ({t['source_phc']}) to {t['dest_name']} ({t['destination_phc']}). "
                        f"Transit distance: {t['estimated_transport_distance']} km ({t['estimated_lead_time']} hours). Reason: {t['reason']}."
                    )

            # 4. Detect Clinical Capacity / Bed / Staff Questions
            if any(k in q_lower for k in ["bed", "beds", "doctor", "nurse", "staff", "attendance", "occupancy", "capacity"]):
                citations.append("MoHFW National Bed & Workforce Registry")
                cursor.execute("""
                    SELECT SUM(b.bed_capacity) as total_beds, SUM(b.beds_occupied) as occupied_beds,
                           SUM(s.doctors_total) as total_doctors, SUM(s.doctors_present) as present_doctors,
                           SUM(s.nurses_total) as total_nurses, SUM(s.nurses_present) as present_nurses
                    FROM beds b
                    JOIN staff s ON b.phc_id = s.phc_id AND s.date = b.date
                    WHERE b.date = (SELECT MAX(date) FROM beds)
                """)
                cap_row = cursor.fetchone()
                if cap_row:
                    cap = dict(cap_row)
                    occ_rate = (cap['occupied_beds'] / cap['total_beds'] * 100) if cap['total_beds'] else 0
                    doc_rate = (cap['present_doctors'] / cap['total_doctors'] * 100) if cap['total_doctors'] else 0
                    nurse_rate = (cap['present_nurses'] / cap['total_nurses'] * 100) if cap['total_nurses'] else 0
                    extracted_facts.append(
                        f"Grid Workforce & Bed Status across 208 Facilities: Total Beds: {cap['total_beds']}, "
                        f"Occupied: {cap['occupied_beds']} ({occ_rate:.1f}% occupancy). "
                        f"Doctors on duty: {cap['present_doctors']}/{cap['total_doctors']} ({doc_rate:.1f}% attendance). "
                        f"Nurses on duty: {cap['present_nurses']}/{cap['total_nurses']} ({nurse_rate:.1f}% attendance)."
                    )

            # 5. Detect Scenario / Disaster / Monsoon / Flood / Outbreak Questions
            if any(k in q_lower for k in ["scenario", "flood", "monsoon", "outbreak", "disruption", "emergency", "surge"]):
                citations.append("Causal Poisson Simulation Engine")
                cursor.execute("SELECT scenario_id, name, description, parameters FROM emergency_scenarios")
                scenarios = [dict(r) for r in cursor.fetchall()]
                structured_data["emergency_scenarios"] = scenarios
                for s in scenarios:
                    params_str = s.get('parameters', '')
                    extracted_facts.append(
                        f"Simulation Scenario '{s['name']}' ({s['scenario_id']}): {s['description']}. (Config: {params_str})."
                    )

            # 6. Detect Machine Learning / FedAvg / Model Architecture Questions
            if any(k in q_lower for k in ["model", "ml", "forecast", "fedavg", "federated", "algorithm", "histgradientboosting", "rmse", "mae"]):
                citations.append("HistGradientBoosting v1.0 Model Registry")
                citations.append("Decentralized FedAvg Multi-State Coordinator")
                cursor.execute("SELECT model_id, model_type, version, metrics FROM model_registry")
                models = [dict(r) for r in cursor.fetchall()]
                for m in models:
                    extracted_facts.append(
                        f"Registered Model: {m['model_id']} ({m['model_type']} v{m['version']}). Performance Metrics: {m['metrics']}."
                    )

            # 7. Fallback Baseline Telemetry (Always include top critical items if facts are sparse)
            if len(extracted_facts) < 2:
                cursor.execute("""
                    SELECT p.phc_name, m.generic_name, r.severity, r.days_of_stock, r.risk_probability, i.closing_stock
                    FROM stockout_risks r
                    JOIN phcs p ON r.phc_id = p.phc_id
                    JOIN medicines m ON r.medicine_id = m.medicine_id
                    JOIN inventory i ON r.phc_id = i.phc_id AND r.medicine_id = i.medicine_id AND i.date = (SELECT MAX(date) FROM inventory)
                    ORDER BY r.risk_probability DESC LIMIT 4
                """)
                top_risks = [dict(r) for r in cursor.fetchall()]
                extracted_facts.append("Top Critical Stock-Out Alerts:")
                for tr in top_risks:
                    extracted_facts.append(
                        f"- {tr['phc_name']} for {tr['generic_name']}: {tr['days_of_stock']:.1f} days of stock remaining "
                        f"({tr['closing_stock']} units in stock, {tr['severity']} severity)."
                    )

        # Remove duplicate citations
        unique_citations = list(dict.fromkeys(citations))

        return {
            "question": question,
            "facts": extracted_facts,
            "structured_data": structured_data,
            "citations": unique_citations
        }

context_retriever = GroundedContextRetriever()
