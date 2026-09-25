export type Severity = 'CRITICAL' | 'HIGH' | 'WATCH' | 'NORMAL';
export type DataStatus = 'REAL' | 'SIMULATED' | 'DERIVED';

export type UserRole = 
  | 'national_admin' 
  | 'state_admin' 
  | 'district_admin' 
  | 'phc_operator';

export interface StateRecord {
  state_id: string;
  lgd_state_code: number;
  state_name: string;
  source: string;
  data_status: DataStatus;
}

export interface DistrictRecord {
  district_id: string;
  lgd_district_code: number;
  state_id: string;
  district_name: string;
  latitude: number;
  longitude: number;
  source: string;
  data_status: DataStatus;
}

export interface PhcRecord {
  phc_id: string;
  state_id: string;
  district_id: string;
  phc_name: string;
  latitude: number;
  longitude: number;
  population_served: number;
  bed_capacity: number;
  facility_type: string;
  data_status: DataStatus;
  district_name?: string;
  state_name?: string;
  latest_demand?: any;
  latest_beds?: any;
  latest_staff?: any;
  inventory_risks?: any[];
}

export interface MedicineRecord {
  medicine_id: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  unit: string;
  essential_medicine: boolean;
  shelf_life_days: number;
  min_safety_stock_days: number;
  lead_time_days: number;
  source: string;
  data_status: DataStatus;
}

export interface InventoryRow {
  date: string;
  phc_id: string;
  medicine_id: string;
  opening_stock: number;
  received_quantity: number;
  dispensed_quantity: number;
  closing_stock: number;
  reorder_level: number;
  lead_time_days: number;
  expiry_risk: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  unit: string;
  phc_name: string;
  district_id: string;
  state_id: string;
  district_name: string;
  state_name: string;
  severity: Severity;
  risk_probability: number;
  risk_percent?: number;
  days_of_stock: number;
  depletion_horizon?: number;
  expected_stockout_date?: string;
  predicted_demand?: number;
  lower_bound?: number;
  upper_bound?: number;
  risk_factors?: any[];
}

export interface StockoutRiskRow {
  risk_id: string;
  phc_id: string;
  medicine_id: string;
  risk_probability: number;
  risk_percent?: number;
  expected_stockout_date?: string;
  days_of_stock: number;
  depletion_horizon?: number;
  severity: Severity;
  model_version: string;
  generic_name: string;
  category: string;
  phc_name: string;
  district_id: string;
  state_id: string;
  district_name: string;
  closing_stock: number;
  lead_time_days: number;
  predicted_demand?: number;
  daily_burn_rate?: number;
  reason?: string;
  risk_factors?: Array<{ factor: string; severity: string; detail: string }>;
}

export interface TransferRow {
  transfer_id: string;
  source_phc: string;
  destination_phc: string;
  medicine_id: string;
  generic_name: string;
  unit: string;
  category: string;
  quantity: number;
  estimated_transport_distance: number;
  estimated_lead_time: number;
  source_surplus: number;
  destination_need: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: string;
  reason: string;
  source_phc_name?: string;
  destination_phc_name?: string;
}

export interface EmergencyScenario {
  scenario_id: string;
  name: string;
  description: string;
  parameters: string;
}

export interface SimulationResult {
  scenario_id: string;
  scenario_name: string;
  description: string;
  affected_districts: string[];
  parameters: any;
  timestamp: string;
  before: any;
  after: any;
  deltas: {
    phcs_at_risk_delta: number;
    critical_risks_delta: number;
    beds_available_delta: number;
    recommended_transfers_delta: number;
    transfer_volume_delta: number;
  };
}

export interface FederatedRound {
  round_id: number;
  round_number: number;
  participating_states: string;
  total_samples: number;
  global_model_version: string;
  pre_aggregation_loss: number;
  post_aggregation_loss: number;
  global_mae: number;
  status: string;
  timestamp: string;
}

export interface NationalKPIs {
  geographic_coverage: {
    states_represented: number;
    districts_represented: number;
    phcs_monitored: number;
    medicines_catalogued: number;
    official_national_reference: {
      total_phcs_india: number;
      reference_source: string;
    };
  };
  stockout_summary: {
    critical_stockouts: number;
    high_risk_items: number;
    watch_items: number;
    normal_items: number;
    phcs_at_risk: number;
  };
  bed_capacity: {
    total_capacity: number;
    beds_occupied: number;
    beds_available: number;
    occupancy_rate: number;
  };
  staff_readiness: {
    doctors_present: number;
    doctors_total: number;
    nurses_present: number;
    nurses_total: number;
    attendance_rate: number;
  };
  redistribution: {
    recommended_transfers: number;
    transfer_volume: number;
  };
}

export interface SearchResult {
  query: string;
  phcs: { 
    phc_id: string; 
    phc_name: string; 
    facility_type: string; 
    district_name: string; 
    state_name: string;
  }[];
  districts: { 
    district_id: string; 
    district_name: string; 
    state_name: string;
  }[];
  medicines: { 
    medicine_id: string; 
    generic_name: string; 
    category: string; 
    dosage_form: string; 
    unit: string;
  }[];
  alerts: { 
    risk_id: string; 
    phc_id: string; 
    phc_name: string; 
    generic_name: string; 
    severity: Severity; 
    days_of_stock: number;
  }[];
}

export interface ActivityEvent {
  created_at: string;
  event_type: 'TRANSFER' | 'RISK_ALERT' | 'FEDERATED';
  level: string;
  message: string;
  entity_id: string;
}

export interface NotificationItem {
  id: string;
  category: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  link_id: string;
  link_type: 'phc' | 'transfer' | 'federated' | 'medicine';
}

export interface WorkforceSummary {
  doctors_sanctioned: number;
  doctors_present: number;
  nurses_sanctioned: number;
  nurses_present: number;
  pharmacists_sanctioned: number;
  pharmacists_present: number;
  overall_attendance_rate: number;
  reporting_facilities: number;
  district_breakdown: {
    district_id: string;
    district_name: string;
    doctors_present: number;
    doctors_total: number;
    nurses_present: number;
    nurses_total: number;
    attendance_rate: number;
  }[];
}

export interface BedsSummary {
  total_capacity: number;
  beds_occupied: number;
  beds_available: number;
  avg_occupancy_rate: number;
  reporting_facilities: number;
  district_breakdown: {
    district_id: string;
    district_name: string;
    total_beds: number;
    beds_occupied: number;
    beds_available: number;
    occupancy_rate: number;
  }[];
}

export interface AnalyticsTrendRow {
  date: string;
  opd_patients: number;
  ipd_patients: number;
  emergency_patients: number;
  disease_index: number;
  bed_occupancy_rate: number;
  staff_attendance_rate: number;
}

export type DrawerType = 'medicine' | 'risk' | 'transfer' | 'copilot' | 'notifications';

export interface DrawerState {
  isOpen: boolean;
  type: DrawerType | null;
  data?: any;
}

// Authentication & Scoped Access Types
export interface AuthUser {
  user_id: string;
  username: string;
  role: 'admin' | 'phc_operator';
  phc_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  phc_info?: {
    phc_name: string;
    district_id: string;
    state_id: string;
  } | null;
}

export interface AuditLogItem {
  id: number;
  phc_id: string;
  username: string;
  timestamp: string;
  action: string;
  data_type: string;
  previous_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  ip_address?: string;
}

export interface PhcDashboardData {
  phc: PhcRecord;
  demand?: {
    opd_patients: number;
    ipd_patients: number;
    emergency_patients: number;
    disease_index: number;
    date: string;
  } | null;
  beds?: {
    bed_capacity: number;
    beds_occupied: number;
    beds_available: number;
    occupancy_rate: number;
    date: string;
  } | null;
  staff?: {
    doctors_present: number;
    doctors_total: number;
    nurses_present: number;
    nurses_total: number;
    pharmacists_present: number;
    pharmacists_total: number;
    attendance_rate: number;
    date: string;
  } | null;
  risks: InventoryRow[];
  transfers: TransferRow[];
  audit_history: AuditLogItem[];
}

export interface NearbyPhc {
  phc_id: string;
  phc_name: string;
  district_id: string;
  district_name: string;
  distance_km: number;
  estimated_transit_hours: number;
  surplus_items: {
    medicine_id: string;
    generic_name: string;
    closing_stock: number;
    reorder_level: number;
    surplus_quantity: number;
  }[];
}

export interface ModelSpecification {
  model_id: string;
  model_name: string;
  type: string;
  algorithm: string;
  file_path: string;
  source_training_data: {
    source: string;
    description: string;
    records_count: number;
  };
  features: string[];
  target: string;
  train_val_test_split: {
    train_pct: number;
    test_pct: number;
    strategy: string;
  };
  metrics: Record<string, any>;
  confusion_matrix?: {
    labels: string[];
    matrix: number[][];
  } | null;
  feature_importance: {
    feature: string;
    importance: number;
  }[];
  sample_predictions: Record<string, any>[];
  governance: {
    version: string;
    compliance: string;
    fairness_audit: string;
    last_trained: string;
  };
}

export interface CustomModelRun {
  run_id: string;
  uploaded_filename: string;
  task_type: string;
  target_column: string;
  records_count: number;
  metrics: Record<string, any>;
  feature_importance: { feature: string; importance: number }[];
  sample_predictions: Record<string, any>[];
  confusion_matrix?: {
    labels: string[];
    matrix: number[][];
  } | null;
  created_at: string;
  status: string;
}

