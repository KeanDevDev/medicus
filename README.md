# MEDICUS (स्वास्थ्य ग्रिड / Swasthya Grid)
### Enterprise Public Healthcare Operations, Federated AI & Supply Chain Command Platform
**Built for the "Build with AI: Code for Communities — Smart Health" Hackathon**

---

## 1. Product Overview

**MEDICUS** is an enterprise-grade public healthcare operations and federated AI control tower designed for national-scale Primary Health Centre (PHC) management across India.

It transforms fragmented, delayed operational signals into proactive intelligence:
- **Predictive Demand & Stock-Out Intelligence:** Forecasts 7-day and 14-day consumption with empirical 90% prediction intervals; calculates calibrated stock-out probabilities and depletion horizons.
- **Deterministic Redistribution Optimizer:** Dynamically matches deficit facilities with nearby surplus donors, minimizing transit distance while guaranteeing donor safety stock.
- **Clinical Capacity & Workforce Monitoring:** Real-time tracking of bed occupancy, critical beds, doctor & nurse attendance rates, and patient footfall.
- **Role-Based Operations (Admin & PHC Portals):** National, state, and district-level administrative oversight paired with dedicated local PHC portals for facility officers.
- **Admin ML Studio & Explainability:** Transparent model performance cards, training parameters, feature importance, and interactive user dataset ingestion/validation/retraining pipelines.
- **Decentralized Federated Learning (FedAvg):** Demonstrates how Indian states train shared predictive models without centralizing state-local operational or patient records.
- **Grounded Google AI Intelligence:** Leverages Google Vertex AI / Gemini 3.8 Flash to synthesize operational briefings and explain root causes strictly from verified telemetry.
- **Apple-Inspired Design System:** Calm, fluid, high-contrast, responsive interface built with modern typography, subtle glassmorphism, and instant telemetry search.

---

## 2. Core Architecture & Non-Hallucination Mandate

MEDICUS operates under a strict, non-negotiable data provenance policy, distinguishing five distinct tiers:

| Tier | Category | Verified Source / Methodology | Status Tag in UI |
| :--- | :--- | :--- | :--- |
| **1** | **Verified Real Public Data** | Canonical LGD state/district codes, Census 2011 Primary Census Abstract populations, MoHFW Beds as of 31-03-2023, HMIS disease rates, IMD rainfall normals, NLEM 2022 drug gazette. | `REAL GOV DATA` |
| **2** | **Calibrated Simulation** | 208 simulated PHCs prefixed `SIM-PHC-[STATE]-[DISTRICT]-[SEQ]`. Causal Poisson process maintaining mathematical conservation of mass: $Closing = Opening + Recv - Disp - Damaged$. | `SIMULATED CALIBRATED` |
| **3** | **Derived Features** | Days of stock, rolling 7-day average consumption, disease index multipliers, and transit distance (km). | `DERIVED ML` |
| **4** | **Model Predictions** | HistGradientBoosting 7-day forward consumption forecasts with 90% prediction intervals and calibrated stock-out risk probabilities. | `DERIVED ML` |
| **5** | **Scenario Outputs** | Dynamic stress-test metrics (Heavy Monsoon, Flood Disruption, Acute Outbreak) dynamically recalculated by the simulation engine. | `SIMULATED CALIBRATED` |

> Complete details, official URLs, and SHA-256 signatures are documented in [docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) and [data/source_registry.json](data/source_registry.json).

---

## 3. Key Modules & Capabilities

### A. Role-Based Access Control (RBAC) & Authentication
- **Secure JWT Session Management:** Stateless JSON Web Token authentication with local token fallback.
- **Admin Control Tower:** Full visibility across national, state, and district metrics, ML model architectures, scenario simulations, and system-wide audits.
- **Granular PHC Portal:** Dedicated view for Primary Health Centre medical officers displaying local drug inventory, bed status, staff rosters, patient intake, and pending incoming transfers.

### B. Calibrated Stock-Out Risk Matrix
- Smooth sigmoid logistic model over normalized days-of-stock and safety buffer coverage.
- Continuous, well-distributed risk scores ranging from low (<30%) to critical (>80%) with clear depletion horizons (in days).

### C. Admin ML Studio & Model Auditing
- In-depth inspection of production models: training datasets, features, target metrics (MAE, RMSE, F1, ROC-AUC), and feature importance.
- User dataset upload: Ingest custom CSV datasets, run automated schema validation, train candidate models, inspect confusion matrices, and evaluate side-by-side.

### D. Deterministic Resource Redistribution
- Linear-distance mathematical optimization matching facilities in critical deficit with surplus donors within radius.
- Preserves minimum safety thresholds for donor facilities to prevent cascading secondary deficits.

### E. Decentralized Federated Learning (FedAvg)
- Multi-round model parameter aggregation across simulated state client nodes (Maharashtra, Karnataka, Rajasthan).
- Preserves state data sovereignty: raw rows never cross state boundaries.

---

## 4. Quickstart: Local Setup & Running

### Prerequisites
- **Python 3.11+**
- **Node.js v18+ / npm 9+**
- **Git**

### 1. Clone & Configure
```bash
git clone <your-repo-url>
cd H2S

# Optional: configure environment variables
cp .env.example .env
```
*(No configuration required to start: SQLite database is packaged, and Gemini gracefully falls back to deterministic local intelligence if an API key is not supplied).*

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend (port 8000)
# Note: On first run, data/swasthya_grid.db.zip is automatically extracted!
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend

# Install npm packages
npm install

# Start Vite development server (port 5173)
npm run dev
```
Open **`http://localhost:5173`** (or `http://localhost:8000` when serving production build) in your browser.

---

## 5. Default Demo Credentials

| Role | Username / Identifier | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin123` | National Control Tower, ML Studio, All Districts & PHCs, Audit Logs |
| **PHC Officer (Sample 1)** | `SIM-PHC-KA-BEL-001` | `phc123` | Belagavi PHC 001 Local Inventory, Beds, Staff, Incoming Transfers |
| **PHC Officer (Sample 2)** | `SIM-PHC-MH-PUN-001` | `phc123` | Pune PHC 001 Local Inventory, Beds, Staff, Incoming Transfers |

*(Note: Any of the 208 simulated PHC IDs with password `phc123` will log in to that respective PHC's localized dashboard).*

---

## 6. Running Tests & Audit Verification

Execute the complete test suite (RBAC tests, stock-out model calibration, data invariant checks, emergency simulations):
```bash
# Run all unit and integration tests
python -m unittest discover tests

# Run comprehensive hackathon project audit
python scripts/project_audit.py
```

---

## 7. Pre-Packaged Database & GitHub Safety

- **Database Compression:** The pre-populated SQLite database is stored in version control as [`data/swasthya_grid.db.zip`](file:///d:/MEHRAN/H2S/data/swasthya_grid.db.zip) (~21 MB), well within GitHub's 100 MB file limit.
- **Automatic Decompression:** [`backend/database.py`](file:///d:/MEHRAN/H2S/backend/database.py) auto-extracts `swasthya_grid.db.zip` on first run if `swasthya_grid.db` does not exist.
- **Packaging Utility:** To re-compress the database after modifying schema or data:
  ```bash
  python scripts/package_db.py
  ```
- **Git Hygiene:** Clean `.gitignore` excludes node_modules, build artifacts, virtualenvs, `.env` files, and raw `.db` files.

---

## 8. Documentation Index

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md):** Complete technical architecture, mathematical formulations, and cloud topology.
- **[docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md):** Verified GoI data sources, official URLs, access methods, and transformation steps.
- **[docs/pitch_deck.md](docs/pitch_deck.md):** Pitch presentation for review.
- **[docs/demo_script.md](docs/demo_script.md):** Video demonstration storyboard and script.
- **[docs/submission_description.md](docs/submission_description.md):** Hackathon submission summary.
- **[docs/DELIVERABLE_AUDIT.md](docs/DELIVERABLE_AUDIT.md):** Item-by-item deliverable checklist.
- **[docs/CLAIMS_AUDIT.md](docs/CLAIMS_AUDIT.md):** Rigorous anti-hallucination audit of metrics and claims.

---

## License
Built for the **Google Build with AI: Code for Communities — Smart Health** Hackathon. Open Government Data License (GODL) India applies to ingested government datasets.
