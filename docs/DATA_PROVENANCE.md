# Data Provenance & Methodology Specification
## Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain

> **NON-NEGOTIABLE COMPLIANCE DIRECTIVE**
> Swasthya Grid strictly differentiates between:
> 1. **Verified Real Government / Public Data**
> 2. **Synthetic / Simulated Operational Data**
> 3. **Derived Features**
> 4. **Model Predictions**
> 5. **Scenario-Simulation Outputs**
>
> Under no circumstances is simulated data presented as actual government records, nor are model predictions presented as factual historical observations.

---

## 1. Verified Public Datasets & Ground Truth Anchors

| Dataset ID | Publisher / Source | Official URL / Domain | Real / Synthetic | Scope & Granularity | Coverage Period |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LGD-GOI** | Ministry of Panchayati Raj, GoI | `https://lgdirectory.gov.in/` | **REAL** | 5 States, 26 Districts (Official LGD Codes) | Current Canonical LGD |
| **MOHFW-BEDS-2023** | Ministry of Health & Family Welfare | `https://mohfw.gov.in/` | **REAL** | State-wise public beds (PHC, CHC, SDH, DH) | As of 31-03-2023 |
| **CENSUS-INDIA-2011** | Registrar General & Census Commissioner | `https://censusindia.gov.in/` | **REAL** | District population, rural/urban ratios | Census 2011 baseline |
| **HMIS-MOHFW** | MoHFW / Open Government Data | `https://hmis.mohfw.gov.in/` | **REAL** | OPD/IPD trends, disease indicators (diarrhoea, malaria, ARI) | 2022–2024 annual/monthly |
| **IMD-WEATHER** | India Meteorological Department | `https://mausam.imd.gov.in/` | **REAL** | District rainfall normals, monsoon windows, alert signals | Meteorological Climatology |
| **NLEM-2022** | MoHFW & CDSCO / PMBJP | `https://cdsco.gov.in/` | **REAL** | 20 core essential medicines, dosage forms, therapeutic categories | NLEM 2022 Gazette |

---

## 2. Statistical Calibration & Synthetic Generation Methodology

### Why Synthetic Operational Data is Required
While the Government of India publishes high-level monthly district HMIS reports and annual Rural Health Statistics (RHS), **daily facility-level (PHC) medicine inventory logs, pharmacist issues, and doctor attendances are held within state-specific intranets (e.g. e-Aushadhi / DVDMS) and are NOT publicly downloadable as an open national machine-readable database.**

To build an India-scale predictive supply-chain platform without hallucinating fake facility data, Swasthya Grid employs a **statistically and causally calibrated simulation**:

1. **Facility Nomenclature**:
   Synthetic PHCs are explicitly prefixed with `SIM-PHC-[STATE_CODE]-[DISTRICT_CODE]-[SEQ]` (e.g., `SIM-PHC-MH-PUN-001`). No fake facility is disguised as an actual physical health center.
2. **Catchment Population**:
   Calibrated using Census 2011 district populations and Indian Public Health Standards (IPHS) norms (20,000–30,000 per rural PHC, 50,000 per urban PHC).
3. **Bed Capacity Anchor**:
   Anchored using the official MoHFW 31-03-2023 state-level bed statistics. Individual PHC bed capacities are assigned between 4 and 10 beds (IPHS standard).
4. **Causal Disease & Patient Volume Dynamics**:
   - Baseline Outpatient (OPD) and Inpatient (IPD) Poisson distributions conditioned on catchment size and season.
   - Seasonal disease spikes (Acute Diarrhoeal Disease during monsoon, Malaria in post-monsoon, Acute Respiratory Infections in winter) calibrated against HMIS district indicator ratios.
   - Weather signals modulated by official IMD rainfall climatology and warning departure categories.
5. **Consumption & Inventory Mechanics (e-Aushadhi Inspired)**:
   - Consumption rates follow clinical protocols per patient category (e.g., ORS + Zinc for diarrhoeal disease, Paracetamol for pyrexia, Amoxicillin/Azithromycin for bacterial infections).
   - Reorder levels and safety stocks are calculated using lead times (3–10 days) and average daily consumption.
   - Stock replenishments, receipts, dispenses, and expiries maintain strict conservation of mass:
     $$\text{Closing Stock}_t = \text{Opening Stock}_t + \text{Received}_t - \text{Dispensed}_t - \text{Damaged/Expired}_t$$

---

## 3. Data Integrity & Validation Invariants

Every ingested or simulated record is subjected to automated validation (`data_pipeline/validate_data.py`):
1. **Inventory Balance**: $\text{Closing Stock} \ge 0$, $\text{Received} \ge 0$, $\text{Dispensed} \ge 0$.
2. **Capacity Bounds**: $\text{Beds Occupied} \le \text{Bed Capacity}$.
3. **Staff Attendance**: $\text{Staff Present} \le \text{Total Sanctioned Staff}$.
4. **Geographic Integrity**: Canonical LGD foreign-key integrity verified across state, district, and facility hierarchies.
5. **Transfer Feasibility**: Recommended transfers cannot exceed source surplus ($\text{Quantity} \le \text{Source Stock} - \text{Safety Stock}$) and destination requirement must be positive.

---

## 4. Source Registry File
The machine-readable source registry is maintained at `data/source_registry.json`. All API consumers, frontend dashboards, and model evaluation modules query this registry directly for transparent provenance presentation.
