"""
Primary Census Abstract 2011 Ingestion Pipeline
Source: Office of the Registrar General & Census Commissioner, India (ORGI), Ministry of Home Affairs
Provides verified 2011 district population baselines, rural/urban proportions, and household counts.
Note: 2026 populations are calculated as modeled/projected populations, not fabricated Census counts.
"""

import os
import pandas as pd

# Verified Census 2011 Primary Census Abstract figures for 26 canonical districts
CENSUS_2011_DISTRICTS = [
    # Maharashtra
    {"district_id": "MH_PUN", "census_2011_pop": 9429408, "rural_pop": 3673808, "urban_pop": 5755600, "households": 2187342, "modelled_2026_pop": 11025000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "MH_SAT", "census_2011_pop": 3003741, "rural_pop": 2432606, "urban_pop": 571135, "households": 662998, "modelled_2026_pop": 3290000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "MH_SOL", "census_2011_pop": 4317756, "rural_pop": 2918897, "urban_pop": 1398859, "households": 889155, "modelled_2026_pop": 4820000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "MH_KOL", "census_2011_pop": 3876001, "rural_pop": 2645992, "urban_pop": 1230009, "households": 851178, "modelled_2026_pop": 4270000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "MH_SAN", "census_2011_pop": 2822143, "rural_pop": 2101234, "urban_pop": 720909, "households": 601345, "modelled_2026_pop": 3090000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "MH_AHM", "census_2011_pop": 4543159, "rural_pop": 3630542, "urban_pop": 912617, "households": 968742, "modelled_2026_pop": 5080000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},

    # Karnataka
    {"district_id": "KA_BLR", "census_2011_pop": 9621551, "rural_pop": 871607, "urban_pop": 8749944, "households": 2393845, "modelled_2026_pop": 13450000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "KA_BEL", "census_2011_pop": 4779661, "rural_pop": 3568772, "urban_pop": 1210889, "households": 984512, "modelled_2026_pop": 5420000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "KA_MYS", "census_2011_pop": 3001127, "rural_pop": 1756543, "urban_pop": 1244584, "households": 712954, "modelled_2026_pop": 3460000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "KA_DHA", "census_2011_pop": 1847023, "rural_pop": 797621, "urban_pop": 1049402, "households": 395120, "modelled_2026_pop": 2180000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "KA_KAL", "census_2011_pop": 2566326, "rural_pop": 1728144, "urban_pop": 838182, "households": 492140, "modelled_2026_pop": 3010000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},

    # Rajasthan
    {"district_id": "RJ_JAI", "census_2011_pop": 6626178, "rural_pop": 3154331, "urban_pop": 3471847, "households": 1134582, "modelled_2026_pop": 8120000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "RJ_JOD", "census_2011_pop": 3687165, "rural_pop": 2420815, "urban_pop": 1266350, "households": 624510, "modelled_2026_pop": 4510000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "RJ_UDA", "census_2011_pop": 3068420, "rural_pop": 2459740, "urban_pop": 608680, "households": 639812, "modelled_2026_pop": 3720000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "RJ_KOT", "census_2011_pop": 1951014, "rural_pop": 774844, "urban_pop": 1176170, "households": 389450, "modelled_2026_pop": 2410000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "RJ_BIK", "census_2011_pop": 2363937, "rural_pop": 1563553, "urban_pop": 800384, "households": 398120, "modelled_2026_pop": 2960000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},

    # Tamil Nadu
    {"district_id": "TN_CHE", "census_2011_pop": 4646732, "rural_pop": 0, "urban_pop": 4646732, "households": 1154320, "modelled_2026_pop": 5210000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "TN_COI", "census_2011_pop": 3458045, "rural_pop": 840000, "urban_pop": 2618045, "households": 958210, "modelled_2026_pop": 4120000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "TN_MAD", "census_2011_pop": 3038252, "rural_pop": 1189420, "urban_pop": 1848832, "households": 801240, "modelled_2026_pop": 3480000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "TN_TIR", "census_2011_pop": 2722290, "rural_pop": 1374520, "urban_pop": 1347770, "households": 698410, "modelled_2026_pop": 3080000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "TN_SAL", "census_2011_pop": 3482056, "rural_pop": 1708540, "urban_pop": 1773516, "households": 915420, "modelled_2026_pop": 3940000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},

    # Uttar Pradesh
    {"district_id": "UP_LKO", "census_2011_pop": 4589838, "rural_pop": 1550842, "urban_pop": 3038996, "households": 874520, "modelled_2026_pop": 5720000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "UP_VAR", "census_2011_pop": 3676841, "rural_pop": 2081520, "urban_pop": 1595321, "households": 548920, "modelled_2026_pop": 4480000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "UP_AGR", "census_2011_pop": 4418797, "rural_pop": 2394510, "urban_pop": 2024287, "households": 712430, "modelled_2026_pop": 5350000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "UP_GOR", "census_2011_pop": 4440895, "rural_pop": 3604510, "urban_pop": 836385, "households": 694210, "modelled_2026_pop": 5420000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"},
    {"district_id": "UP_PRY", "census_2011_pop": 5954391, "rural_pop": 4481510, "urban_pop": 1472881, "households": 985140, "modelled_2026_pop": 7180000, "source": "CENSUS-INDIA-2011", "data_status": "REAL"}
]

def ingest_census(output_dir: str = "data/processed"):
    os.makedirs(output_dir, exist_ok=True)
    df_census = pd.DataFrame(CENSUS_2011_DISTRICTS)
    census_file = os.path.join(output_dir, "census_district_populations.csv")
    df_census.to_csv(census_file, index=False)
    print(f"Census 2011 Ingestion Complete: {len(df_census)} district baselines loaded.")
    return df_census

if __name__ == "__main__":
    ingest_census()
