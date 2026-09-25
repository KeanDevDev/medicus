# Pitch Deck: Swasthya Grid
## Federated AI Control Tower for India's Public Health Supply Chain
### Hackathon: Build with AI: Code for Communities — Smart Health

---

### Slide 1: Title & Purpose
**Swasthya Grid**  
*Federated AI Control Tower for National-Scale PHC Health Resource & Supply Chain Management*  
- **Domain:** Smart Health, Public Health Logistics, Community Resilience  
- **Team Lead & Builders:** Lead Product, ML, Cloud & Systems Engineers  
- **Motto:** Preventing Stock-outs, Preserving State Data Sovereignty, Grounding Action in Verified Data.

---

### Slide 2: The Critical Public Health Challenge
- India's public healthcare backbone encompasses **31,053 Primary Health Centres (PHCs)** serving over 800 million citizens.
- **The Problem:** Fragmented, delayed visibility across district store depots and peripheral clinics results in recurring stock-outs of life-saving medicines (ORS, antibiotics, antivenom, chronic NCD drugs) while neighboring centers hold expiring surpluses.
- **Consequence:** Emergency stock-outs during monsoons, epidemics, and climate disruptions force patients into out-of-pocket private expenditures or delayed care.

---

### Slide 3: Why Existing Systems Struggle
1. **Intra-State Data Silos:** State medical corporations operate disparate inventory systems; raw data sharing across state borders faces legal and technical barriers.
2. **Reactive Supply Chains:** Stock is dispatched on rigid quarterly requisition schedules rather than proactive forward epidemiological demand.
3. **Black-Box AI Skepticism:** Health officials reject generative models that hallucinate numbers or lack verifiable mathematical safety constraints.
4. **Disaster Blindspots:** Monsoons, floods, and outbreaks surge demand overnight, rendering static historical averages useless.

---

### Slide 4: The Swasthya Grid Solution
A decentralized, federated AI control tower that:
- **Forecasts Medicine Demand:** 7-day forward predictions with empirical 90% prediction intervals.
- **Classifies Stock-out Risks Early:** Identifies facilities with days-of-stock below supplier lead times.
- **Optimizes Deterministic Redistribution:** Rebalances surplus stock across nearby centers while strictly preserving donor safety buffers.
- **Enables Federated Multi-State Learning:** States collaboratively train high-accuracy models without surrendering raw patient or facility logs.
- **Grounds AI Briefings in Google Gemini:** Vertex AI translates telemetry into actionable directives without fabricating numbers.

---

### Slide 5: System Architecture & Data Flow
- **Data Layer:** Verified GoI anchors (LGD canonical codes, Census 2011, MoHFW 31-03-2023 beds, HMIS disease rates, IMD weather normals, NLEM 2022).
- **Edge Layer:** Decentralized state data partitions (Maharashtra, Karnataka, Rajasthan).
- **Federated Core:** PyTorch Federated Averaging (FedAvg) over parameter weights.
- **ML & Optimization:** HistGradientBoosting regressors + constrained linear redistribution optimizer.
- **Application Interface:** Enterprise React/TypeScript Command Centre with 10 dedicated operational views.

---

### Slide 6: Real vs. Synthetic Data Methodology (Non-Hallucination Core)
- **Zero Fabrication Standard:** Real public data used for all administrative boundaries, district populations, state hospital bed capacities, meteorological normals, and essential medicine standards.
- **Calibrated Causal Simulation:** Where daily facility logs are held in closed intranets, 208 simulated PHCs (`SIM-PHC`) were generated using Poisson processes conditioned on real HMIS disease ratios, seasonal rainfall, and strict mass conservation:
  $$\text{Closing Stock} = \text{Opening Stock} + \text{Received} - \text{Dispensed} - \text{Damaged}$$
- **Full Transparency:** Data Sources Registry (`data/source_registry.json`) and Data Status tags on every screen.

---

### Slide 7: AI Forecasting & Stock-out Risk Engines
- **Model A (Demand Forecaster):** HistGradientBoosting regressor predicting 7-day forward consumption.
  - *Metric:* **MAE: 20.97 units**, **RMSE: 32.01**, **sMAPE: 14.71%** (beats naive baseline MAE of 21.36).
  - *Uncertainty:* Provides empirical 90% prediction intervals $[L, U]$.
- **Model B (Stockout Risk Classifier):** Predicts stockout probability within 7-day replenishment lead time.
  - *Metric:* **Precision: 0.986**, **Recall: 0.992**, **F1-Score: 0.989** (Tested on held-out temporal partition).

---

### Slide 8: Decentralized Federated Learning in Action
- **Participating State Clients:** Maharashtra (86,400 records), Karnataka (72,000 records), Rajasthan (72,000 records).
- **State Sovereignty:** Raw rows never leave state data centers. Only parameter weights ($\theta_k$) are shared.
- **Multi-Round Convergence:**
  - *Round 1:* Pre-Loss: 0.9074 $\rightarrow$ Aggregated Loss: 0.2537 (MAE: 12.69)
  - *Round 2:* Pre-Loss: 0.2425 $\rightarrow$ Aggregated Loss: 0.1690 (MAE: 8.45)
  - *Round 3:* Pre-Loss: 0.1538 $\rightarrow$ Aggregated Loss: 0.1602 (MAE: 8.01)

---

### Slide 9: Emergency Scenario Simulator & Deterministic Optimization
- **Dynamic Stress-Testing:** Officials can simulate Heavy Monsoon, Flood Disruption, Disease Outbreaks, or Depot Halts.
- **Instant Telemetry Recalculation:** Re-evaluates footfall, disease index, days-of-stock, and transfer requirements.
- **Deterministic Optimizer:** Generates transfer recommendations minimizing transit distance while enforcing $\text{Quantity} \le \text{Donor Surplus} - \text{Safety Stock}$.
- **Audit Rationale:** Every recommendation states the exact distance, transit hours, deficit, and safety justification.

---

### Slide 10: Grounded Google AI / Gemini Integration
- **Platform:** Google Vertex AI / `google-genai` SDK using `gemini-3.8-flash`.
- **Structured Tool Grounding:** Ingests live telemetry snapshots (top risks, days of stock, active transfers).
- **AI Operations Brief:** Generates concise 3-part briefings (Executive Alert, Root Causes, Tactical Directives).
- **Ask the Control Tower:** Answers administrator queries ("Why is Satara at risk?", "Which medicine should move first?") strictly from verified context with an anti-hallucination refusal fallback.

---

### Slide 11: India-Scale Deployment Roadmap
- **Cloud Architecture:** Google Cloud Run + BigQuery + Vertex AI + Cloud Storage.
- **Scaling Pathway:**
  - *Current Prototype:* 5 States, 26 LGD Districts, 208 PHCs, 20 NLEM Medicines.
  - *Phase 1 Production:* Integration with state DVDMS / e-Aushadhi APIs via federated edge connectors.
  - *Phase 2 National Scale:* All 36 States/UTs, 788 Districts, 31,053 PHCs on Cloud Run multi-region infrastructure.

---

### Slide 12: Summary of Impact & Verifiability
- **Complete Working System:** Functional end-to-end prototype with passing test suites and automated audit.
- **Audit Verified:** Automated script `scripts/project_audit.py` passes all compliance criteria.
- **Judge Demo Mode:** 30-second inspection tour, instant scenario seeding, and deterministic reset.
- **Commitment to Truth:** Strict provenance, verified metrics, zero hallucinated government records.
