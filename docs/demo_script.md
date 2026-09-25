# Swasthya Grid: 3–5 Minute Demo Video Script & Storyboard
## Federated AI Control Tower for India's Public Health Supply Chain

---

### Video Overview
- **Target Duration:** 4 minutes 30 seconds
- **Presenter:** Technical Lead / System Architect
- **Resolution:** 1080p / 60fps
- **Key Message:** Real public data, working ML, decentralized federated learning, deterministic redistribution, and grounded Google Gemini intelligence.

---

### Sequence & Storyboard

#### 0:00 – 0:30 | Problem & Mission
- **Screen:** Title card and opening pan of the National Overview Command Centre.
- **Voiceover:**
  > "Across India, more than 31,000 Primary Health Centres serve as the first line of defense for public health. Yet, delayed reporting and fragmented state systems cause critical medicine stock-outs during monsoons and epidemics, even while nearby facilities hold expiring stock.
  > Welcome to Swasthya Grid—a federated AI control tower built for national public health supply chain resilience, combining verified Government of India datasets, machine learning demand forecasting, deterministic redistribution, and Google Gemini."

#### 0:30 – 1:00 | National Overview & Verified Ground Truth
- **Screen:** National Command Centre view, pointing out KPI cards (Critical Stockouts, Available Beds, Staff Attendance, Recommended Transfers) and the scale comparison card (Pilot 208 PHCs vs Official National Reference: 31,053 PHCs).
- **Voiceover:**
  > "Here at the National Command Centre, we monitor real-time telemetry across our pilot network: 5 states, 26 canonical LGD districts, and 208 primary health centers.
  > Notice the Data Status tag: we maintain a strict non-negotiable rule against hallucination. Our geographic hierarchy is anchored directly to the Local Government Directory, district populations are anchored to Census 2011, and bed standards are anchored to official MoHFW statistics. All simulated operational streams are explicitly tagged as SIM-PHC."

#### 1:00 – 1:35 | Geographic Drill-Down (State -> District -> PHC)
- **Screen:** Click 'Maharashtra' -> State Dashboard displays Pune, Satara, Solapur -> Click 'Pune' -> District Tower displays 8 sector PHCs -> Click 'Pune Sector-1 UPHC'.
- **Voiceover:**
  > "Let's drill down into Maharashtra, examine the Pune district control tower, and open Pune Sector-1 Urban PHC.
  > Here we see live clinical capacity: bed occupancy, doctor and nurse attendance, and historical 30-day patient footfall. Below, our machine learning engine forecasts 7-day medicine demand with 90% prediction intervals, tracking days-of-stock depletion against supplier lead times."

#### 1:35 – 2:10 | Machine Learning Forecasting & Stock-out Risk
- **Screen:** Hover over prediction intervals and days-of-stock badge for ORS and Paracetamol. Switch to 'Medicine Inventory' view, demonstrating live search and severity filtering.
- **Voiceover:**
  > "Our demand forecaster uses HistGradientBoosting with temporal validation—never random splits. It achieves a 14.7% sMAPE, outperforming moving-average baselines.
  > When days of stock fall below lead time, our classifier flags the item as CRITICAL with an explicit probability and estimated stockout date. Everything is transparent: officials can see exactly why an alert was triggered."

#### 2:10 – 2:50 | Deterministic Resource Redistribution
- **Screen:** Switch to 'AI Redistribution' view. Highlight transfer card: Source PHC, Destination PHC, quantity, distance (e.g. 38 km), transit time, and audit rationale.
- **Voiceover:**
  > "Rather than letting an LLM guess quantities, Swasthya Grid uses a deterministic linear distance optimizer.
  > Look at this transfer recommendation: it identifies a deficit at a high-risk facility, finds a donor within 45 kilometers that possesses a surplus, and transfers exactly the needed quantity—while strictly guaranteeing the donor maintains its mandatory safety buffer. Every transfer includes an auditable mathematical rationale."

#### 2:50 – 3:35 | Emergency Scenario Simulator
- **Screen:** Switch to 'Emergency Simulator' view. Select 'Heavy Monsoon Surge'. Click 'RUN AI RESPONSE'. Show BEFORE vs AFTER comparison cards and deltas.
- **Voiceover:**
  > "Now let's stress-test the network. Health emergencies don't give advance notice.
  > In the Emergency Simulator, we select 'Heavy Monsoon Surge'. When I click 'RUN AI RESPONSE', the engine injects simulated rainfall departures, increases waterborne disease prevalence, and extends replenishment lead times.
  > Instantly, the ML models recompute: high-risk PHCs increase from 195 to 196, available beds decrease, and new priority redistribution transfers are generated. We see exact before-and-after deltas."

#### 3:35 – 4:05 | Multi-State Federated Learning
- **Screen:** Switch to 'Federated Learning' view. Pan across the 3 state edge client nodes (MH, KA, RJ), show parameter averaging formula, and display the loss convergence curve over Rounds 1, 2, and 3.
- **Voiceover:**
  > "State healthcare data is sensitive. Swasthya Grid implements true decentralized Federated Learning using FedAvg across isolated state nodes: Maharashtra, Karnataka, and Rajasthan.
  > Each state trains a local neural network on its own edge dataset—over 230,000 records total. Only parameter weights are transmitted to the central aggregator; raw patient and facility logs never leave state boundaries. Over 3 rounds, we see global MSE loss drop from 0.90 to 0.16."

#### 4:05 – 4:35 | Grounded Google Gemini Copilot & Conclusion
- **Screen:** Switch to 'AI Copilot' view. Click preset question: 'Why are certain PHCs at critical stock-out risk?'. Show grounded answer with Gemini source badge. Open 'Judge Tour Guide' modal.
- **Voiceover:**
  > "Finally, we integrate Google Gemini 3.8 Flash through Vertex AI. Gemini doesn't make up numbers—it is grounded strictly in structured backend telemetry. It explains root causes, cites exact stock figures, and provides actionable directives to district magistrates.
  > Judges can click 'Judge Demo Mode' at any time to run a 30-second tour or reset to baseline.
  > Swasthya Grid: verifiable AI for India's public health frontline. Thank you."
