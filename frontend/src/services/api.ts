import { 
  StateRecord, DistrictRecord, PhcRecord, MedicineRecord, 
  InventoryRow, StockoutRiskRow, TransferRow, EmergencyScenario, 
  SimulationResult, FederatedRound, NationalKPIs,
  SearchResult, ActivityEvent, NotificationItem, WorkforceSummary, BedsSummary, AnalyticsTrendRow,
  AuthUser, PhcDashboardData, NearbyPhc, ModelSpecification, CustomModelRun, AuditLogItem
} from '../types';

const API_BASE = '/api';

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('medicus_token') : null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('medicus_token', token);
    } else {
      localStorage.removeItem('medicus_token');
    }
  }
};

export const getAuthToken = () => authToken;

const getAuthHeaders = (extra: Record<string, string> = {}): HeadersInit => {
  const headers: Record<string, string> = { ...extra };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

export const api = {
  // -----------------
  // Authentication & Session
  // -----------------
  login: async (username: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Authentication failed');
    }
    const data = await res.json();
    setAuthToken(data.token);
    return data;
  },

  getMe: async (): Promise<AuthUser> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Session invalid or expired');
    return res.json();
  },

  getDemoPresets: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/auth/demo-presets`);
    if (!res.ok) throw new Error('Failed to fetch demo presets');
    return res.json();
  },

  logout: () => {
    setAuthToken(null);
  },

  // -----------------
  // Geography
  // -----------------
  getStates: async (): Promise<StateRecord[]> => {
    const res = await fetch(`${API_BASE}/states`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch states');
    return res.json();
  },

  getDistricts: async (stateId?: string): Promise<DistrictRecord[]> => {
    const url = stateId ? `${API_BASE}/districts?state_id=${stateId}` : `${API_BASE}/districts`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch districts');
    return res.json();
  },

  getPhcs: async (stateId?: string, districtId?: string): Promise<PhcRecord[]> => {
    const params = new URLSearchParams();
    if (stateId) params.append('state_id', stateId);
    if (districtId) params.append('district_id', districtId);
    params.append('limit', '250');
    const res = await fetch(`${API_BASE}/phcs?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch PHCs');
    return res.json();
  },

  getPhcDetail: async (phcId: string): Promise<PhcRecord> => {
    const res = await fetch(`${API_BASE}/phcs/${phcId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch PHC details');
    return res.json();
  },

  // -----------------
  // National KPIs & Admin Overview
  // -----------------
  getNationalKpis: async (stateId?: string, districtId?: string): Promise<NationalKPIs> => {
    const params = new URLSearchParams();
    if (stateId) params.append('state_id', stateId);
    if (districtId) params.append('district_id', districtId);
    const res = await fetch(`${API_BASE}/national/kpis?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch national KPIs');
    return res.json();
  },

  // -----------------
  // Medicines & Inventory
  // -----------------
  getMedicines: async (): Promise<MedicineRecord[]> => {
    const res = await fetch(`${API_BASE}/medicines`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch medicines');
    return res.json();
  },

  getInventory: async (filters: {
    stateId?: string;
    districtId?: string;
    phcId?: string;
    medicineId?: string;
    severity?: string;
    limit?: number;
  } = {}): Promise<InventoryRow[]> => {
    const params = new URLSearchParams();
    if (filters.stateId) params.append('state_id', filters.stateId);
    if (filters.districtId) params.append('district_id', filters.districtId);
    if (filters.phcId) params.append('phc_id', filters.phcId);
    if (filters.medicineId) params.append('medicine_id', filters.medicineId);
    if (filters.severity) params.append('severity', filters.severity);
    params.append('limit', String(filters.limit || 100));

    const res = await fetch(`${API_BASE}/inventory?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  getStockoutRisks: async (severity?: string, limit: number = 60): Promise<StockoutRiskRow[]> => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    params.append('limit', String(limit));
    const res = await fetch(`${API_BASE}/stockout-risks?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stockout risks');
    return res.json();
  },

  getRecommendations: async (priority?: string, status: string = 'RECOMMENDED'): Promise<TransferRow[]> => {
    const params = new URLSearchParams();
    if (priority) params.append('priority', priority);
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/recommendations?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  },

  approveTransfer: async (transferId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/recommendations/${transferId}/approve`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to approve transfer');
    return res.json();
  },

  rejectTransfer: async (transferId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/recommendations/${transferId}/reject`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to reject transfer');
    return res.json();
  },

  getDemandSeries: async (phcId?: string, districtId?: string, days: number = 30): Promise<any[]> => {
    const params = new URLSearchParams();
    if (phcId) params.append('phc_id', phcId);
    if (districtId) params.append('district_id', districtId);
    params.append('days', String(days));
    const res = await fetch(`${API_BASE}/demand?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch demand series');
    return res.json();
  },

  // -----------------
  // PHC Operator Scoped Portal & Data Entry
  // -----------------
  getPhcDashboard: async (phcId: string): Promise<PhcDashboardData> => {
    const res = await fetch(`${API_BASE}/phc/${phcId}/dashboard`, { headers: getAuthHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch PHC dashboard' }));
      throw new Error(err.detail || 'Failed to fetch PHC dashboard');
    }
    return res.json();
  },

  getPhcInventory: async (phcId: string): Promise<InventoryRow[]> => {
    const res = await fetch(`${API_BASE}/phc/${phcId}/inventory`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch PHC inventory');
    return res.json();
  },

  updatePhcInventory: async (data: {
    phc_id: string;
    medicine_id: string;
    received_quantity?: number;
    dispensed_quantity?: number;
    damaged_quantity?: number;
    closing_stock?: number;
    lead_time_days?: number;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/phc/inventory/update`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update inventory' }));
      throw new Error(err.detail || 'Failed to update inventory');
    }
    return res.json();
  },

  updatePhcDemand: async (data: {
    phc_id: string;
    opd_patients: number;
    ipd_patients: number;
    emergency_patients: number;
    disease_index: number;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/phc/demand/update`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update clinical demand' }));
      throw new Error(err.detail || 'Failed to update clinical demand');
    }
    return res.json();
  },

  updatePhcBeds: async (data: {
    phc_id: string;
    beds_occupied: number;
    bed_capacity?: number;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/phc/beds/update`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update beds' }));
      throw new Error(err.detail || 'Failed to update beds');
    }
    return res.json();
  },

  updatePhcStaff: async (data: {
    phc_id: string;
    doctors_present: number;
    nurses_present: number;
    pharmacists_present: number;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/phc/staff/update`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update staff' }));
      throw new Error(err.detail || 'Failed to update staff');
    }
    return res.json();
  },

  createPhcTicket: async (data: {
    phc_id: string;
    title: string;
    category: string;
    priority: string;
    description: string;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/phc/tickets`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create ticket' }));
      throw new Error(err.detail || 'Failed to create ticket');
    }
    return res.json();
  },

  getNearbyPhcs: async (phcId: string, medicineId?: string): Promise<NearbyPhc[]> => {
    const url = medicineId 
      ? `${API_BASE}/phc/${phcId}/nearby?medicine_id=${medicineId}`
      : `${API_BASE}/phc/${phcId}/nearby`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch nearby PHCs');
    return res.json();
  },

  requestLateralTransfer: async (data: {
    source_phc: string;
    destination_phc: string;
    medicine_id: string;
    quantity: number;
    reason: string;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/transfers/request`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to request transfer' }));
      throw new Error(err.detail || 'Failed to request transfer');
    }
    return res.json();
  },

  actionTransfer: async (transferId: string, action: string, notes?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/transfers/${transferId}/action`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to process transfer action' }));
      throw new Error(err.detail || 'Failed to process transfer action');
    }
    return res.json();
  },

  // -----------------
  // Admin ML Studio & Model Ops
  // -----------------
  getAdminModels: async (): Promise<ModelSpecification[]> => {
    const res = await fetch(`${API_BASE}/admin/models`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch active model specifications');
    return res.json();
  },

  trainCustomModel: async (file: File): Promise<CustomModelRun> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/admin/models/train-custom`, {
      method: 'POST',
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Custom model training failed' }));
      throw new Error(err.detail || 'Custom model training failed');
    }
    return res.json();
  },

  getCustomRuns: async (): Promise<CustomModelRun[]> => {
    const res = await fetch(`${API_BASE}/admin/custom-runs`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch custom runs');
    return res.json();
  },

  getAdminAuditLogs: async (limit: number = 50): Promise<AuditLogItem[]> => {
    const res = await fetch(`${API_BASE}/admin/audit-logs?limit=${limit}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch admin audit logs');
    return res.json();
  },

  // -----------------
  // Emergency Scenarios & Simulations
  // -----------------
  getScenarios: async (): Promise<EmergencyScenario[]> => {
    const res = await fetch(`${API_BASE}/simulation/scenarios`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return res.json();
  },

  runSimulation: async (scenarioId: string): Promise<SimulationResult> => {
    const res = await fetch(`${API_BASE}/simulation/run`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ scenario_id: scenarioId }),
    });
    if (!res.ok) throw new Error('Simulation execution failed');
    return res.json();
  },

  // -----------------
  // Federated Learning
  // -----------------
  getFederatedStatus: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/federated/status`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch federated status');
    return res.json();
  },

  triggerFederatedRounds: async (rounds: number = 3): Promise<any> => {
    const res = await fetch(`${API_BASE}/federated/run?rounds=${rounds}`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to trigger federated rounds');
    return res.json();
  },

  // -----------------
  // Gemini Operational AI
  // -----------------
  getOperationalBrief: async (req: { state_id?: string; district_id?: string; phc_id?: string }): Promise<any> => {
    const res = await fetch(`${API_BASE}/gemini/brief`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Failed to generate AI brief');
    return res.json();
  },

  getGeminiStatus: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/gemini/status`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch Gemini status');
    return res.json();
  },

  askControlTower: async (
    question: string,
    context?: { state_id?: string; district_id?: string; phc_id?: string; conversation_history?: any[]; api_key?: string }
  ): Promise<any> => {
    const customKey = localStorage.getItem('medicus_gemini_api_key') || '';
    const headers = getAuthHeaders({ 'Content-Type': 'application/json' }) as Record<string, string>;
    if (customKey) {
      headers['X-Gemini-API-Key'] = customKey;
    }
    const res = await fetch(`${API_BASE}/gemini/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, ...(context || {}), api_key: context?.api_key || customKey || undefined }),
    });
    if (!res.ok) throw new Error('Control Tower query failed');
    return res.json();
  },

  // -----------------
  // Transparency & Provenance
  // -----------------
  getDataSources: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/data-sources`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch data sources');
    return res.json();
  },

  getModelMetrics: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/model-metrics`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch model metrics');
    return res.json();
  },

  // -----------------
  // Enterprise Operations Endpoints
  // -----------------
  search: async (q: string): Promise<SearchResult> => {
    if (!q.trim()) {
      return { query: '', phcs: [], districts: [], medicines: [], alerts: [] };
    }
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q.trim())}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to execute search');
    return res.json();
  },

  getActivity: async (limit: number = 15): Promise<ActivityEvent[]> => {
    const res = await fetch(`${API_BASE}/activity?limit=${limit}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch activity log');
    return res.json();
  },

  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  getWorkforce: async (stateId?: string): Promise<WorkforceSummary> => {
    const url = stateId ? `${API_BASE}/workforce?state_id=${stateId}` : `${API_BASE}/workforce`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch workforce data');
    return res.json();
  },

  getBedsSummary: async (stateId?: string): Promise<BedsSummary> => {
    const url = stateId ? `${API_BASE}/beds/summary?state_id=${stateId}` : `${API_BASE}/beds/summary`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch beds summary');
    return res.json();
  },

  getAnalyticsTrends: async (days: number = 30): Promise<AnalyticsTrendRow[]> => {
    const res = await fetch(`${API_BASE}/analytics/trends?days=${days}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch analytics trends');
    return res.json();
  },

  // -----------------
  // Demo Controls
  // -----------------
  resetDemo: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/demo/reset`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to reset demo');
    return res.json();
  },

  seedDemo: async (scenarioId: string = 'SCN_MONSOON'): Promise<any> => {
    const res = await fetch(`${API_BASE}/demo/seed?scenario_id=${scenarioId}`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to seed demo');
    return res.json();
  },
};
