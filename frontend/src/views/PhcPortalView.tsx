import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  PhcDashboardData, 
  NearbyPhc, 
  MedicineRecord, 
  TransferRow, 
  AuditLogItem 
} from '../types';
import { 
  Building2,
  Package,
  Users,
  ShieldCheck,
  ArrowLeftRight,
  ClipboardCheck,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  Truck,
  XCircle,
  RefreshCw
} from 'lucide-react';

type PhcTab = 'overview' | 'data-entry' | 'inventory' | 'transfers' | 'audit';

export const PhcPortalView: React.FC = () => {
  const { user, logout } = useAuth();
  const phcId = user?.phc_id || 'SIM-PHC-KA-BEL-001';

  const [activeTab, setActiveTab] = useState<PhcTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<PhcDashboardData | null>(null);
  const [nearbyPhcs, setNearbyPhcs] = useState<NearbyPhc[]>([]);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data entry form states
  const [stockMedId, setStockMedId] = useState<string>('MED_ACT_CO');
  const [stockReceived, setStockReceived] = useState<number>(0);
  const [stockDispensed, setStockDispensed] = useState<number>(0);
  const [stockDamaged, setStockDamaged] = useState<number>(0);
  const [stockClosing, setStockClosing] = useState<string>('');
  const [stockLeadTime, setStockLeadTime] = useState<number>(3);
  const [submittingStock, setSubmittingStock] = useState<boolean>(false);

  // Demand form
  const [opdCount, setOpdCount] = useState<number>(65);
  const [ipdCount, setIpdCount] = useState<number>(6);
  const [emergCount, setEmergCount] = useState<number>(3);
  const [diseaseIndex, setDiseaseIndex] = useState<number>(1.2);
  const [submittingDemand, setSubmittingDemand] = useState<boolean>(false);

  // Beds form
  const [bedCapacity, setBedCapacity] = useState<number>(10);
  const [bedsOccupied, setBedsOccupied] = useState<number>(6);
  const [submittingBeds, setSubmittingBeds] = useState<boolean>(false);

  // Staff form
  const [docPresent, setDocPresent] = useState<number>(2);
  const [nurPresent, setNurPresent] = useState<number>(3);
  const [phmPresent, setPhmPresent] = useState<number>(1);
  const [submittingStaff, setSubmittingStaff] = useState<boolean>(false);

  // Incident ticket form
  const [ticketTitle, setTicketTitle] = useState<string>('');
  const [ticketCategory, setTicketCategory] = useState<string>('MEDICINE_STOCKOUT');
  const [ticketPriority, setTicketPriority] = useState<string>('HIGH');
  const [ticketDesc, setTicketDesc] = useState<string>('');
  const [submittingTicket, setSubmittingTicket] = useState<boolean>(false);

  // Transfer request form
  const [transferTargetPhc, setTransferTargetPhc] = useState<string>('');
  const [transferMedId, setTransferMedId] = useState<string>('MED_ACT_CO');
  const [transferQty, setTransferQty] = useState<number>(50);
  const [transferReason, setTransferReason] = useState<string>('Local stockout emergency mitigation');
  const [submittingTransfer, setSubmittingTransfer] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dash, nearby, meds] = await Promise.all([
        api.getPhcDashboard(phcId),
        api.getNearbyPhcs(phcId),
        api.getMedicines()
      ]);
      setData(dash);
      setNearbyPhcs(nearby);
      setMedicines(meds);

      // Pre-fill form inputs from current values if available
      if (dash.demand) {
        setOpdCount(dash.demand.opd_patients);
        setIpdCount(dash.demand.ipd_patients);
        setEmergCount(dash.demand.emergency_patients);
        setDiseaseIndex(dash.demand.disease_index);
      }
      if (dash.beds) {
        setBedCapacity(dash.beds.bed_capacity);
        setBedsOccupied(dash.beds.beds_occupied);
      }
      if (dash.staff) {
        setDocPresent(dash.staff.doctors_present);
        setNurPresent(dash.staff.nurses_present);
        setPhmPresent(dash.staff.pharmacists_present);
      }
      if (nearby.length > 0 && !transferTargetPhc) {
        setTransferTargetPhc(nearby[0].phc_id);
      }
    } catch (err: any) {
      console.error('Error fetching PHC data:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to load facility data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [phcId]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Submit Inventory Stock Update
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStock(true);
    try {
      const payload: any = {
        phc_id: phcId,
        medicine_id: stockMedId,
        received_quantity: Number(stockReceived),
        dispensed_quantity: Number(stockDispensed),
        damaged_quantity: Number(stockDamaged),
        lead_time_days: Number(stockLeadTime),
      };
      if (stockClosing !== '') {
        payload.closing_stock = Number(stockClosing);
      }
      const res = await api.updatePhcInventory(payload);
      showToast('success', `${res.message} (Audit #${res.audit_log_id})`);
      setStockReceived(0);
      setStockDispensed(0);
      setStockDamaged(0);
      setStockClosing('');
      await fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.message || 'Stock update failed');
    } finally {
      setSubmittingStock(false);
    }
  };

  // Submit Demand Update
  const handleUpdateDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDemand(true);
    try {
      const res = await api.updatePhcDemand({
        phc_id: phcId,
        opd_patients: Number(opdCount),
        ipd_patients: Number(ipdCount),
        emergency_patients: Number(emergCount),
        disease_index: Number(diseaseIndex),
      });
      showToast('success', `${res.message} (Audit #${res.audit_log_id})`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.message || 'Demand update failed');
    } finally {
      setSubmittingDemand(false);
    }
  };

  // Submit Beds Update
  const handleUpdateBeds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBeds(true);
    try {
      const res = await api.updatePhcBeds({
        phc_id: phcId,
        bed_capacity: Number(bedCapacity),
        beds_occupied: Number(bedsOccupied),
      });
      showToast('success', `${res.message} (Audit #${res.audit_log_id})`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.message || 'Beds update failed');
    } finally {
      setSubmittingBeds(false);
    }
  };

  // Submit Staff Update
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStaff(true);
    try {
      const res = await api.updatePhcStaff({
        phc_id: phcId,
        doctors_present: Number(docPresent),
        nurses_present: Number(nurPresent),
        pharmacists_present: Number(phmPresent),
      });
      showToast('success', `${res.message} (Audit #${res.audit_log_id})`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.message || 'Staff update failed');
    } finally {
      setSubmittingStaff(false);
    }
  };

  // Submit Incident Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDesc.trim()) {
      showToast('error', 'Please provide ticket title and description.');
      return;
    }
    setSubmittingTicket(true);
    try {
      const res = await api.createPhcTicket({
        phc_id: phcId,
        title: ticketTitle.trim(),
        category: ticketCategory,
        priority: ticketPriority,
        description: ticketDesc.trim(),
      });
      showToast('success', `Ticket ${res.ticket?.ticket_id} filed successfully!`);
      setTicketTitle('');
      setTicketDesc('');
      await fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.message || 'Ticket creation failed');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Submit Transfer Request
  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetPhc) {
      showToast('error', 'Please select a source PHC for redistribution.');
      return;
    }
    setSubmittingTransfer(true);
    try {
      const res = await api.requestLateralTransfer({
        source_phc: transferTargetPhc,
        destination_phc: phcId,
        medicine_id: transferMedId,
        quantity: Number(transferQty),
        reason: transferReason,
      });
      showToast('success', `Lateral transfer ${res.transfer_id} requested successfully!`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.message || 'Transfer request failed');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Action on existing transfer (Approve, Dispatch, Receive, Reject)
  const handleTransferAction = async (transferId: string, action: string) => {
    try {
      const res = await api.actionTransfer(transferId, action);
      showToast('success', `Transfer status updated to ${res.new_status}`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.message || 'Action failed');
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'WATCH':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-blue-100 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl shadow-lg border flex items-center gap-3 backdrop-blur bg-white/95 animate-in fade-in slide-in-from-top-2 duration-200 ${
          notification.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] flex items-center justify-center text-white shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-[#1D1D1F] leading-tight">
                  {data?.phc.phc_name || phcId}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  PHC Operator Portal
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {data?.phc.district_name || 'District'}, {data?.phc.state_name || 'State'} • ID: {phcId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-800">{user?.full_name}</div>
              <div className="text-[11px] text-gray-500">Scoped Operator Access</div>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto no-scrollbar border-t border-gray-100 py-1.5">
          {[
            { id: 'overview', label: 'Facility Overview', icon: Building2 },
            { id: 'data-entry', label: 'Daily Data Entry', icon: PlusCircle },
            { id: 'inventory', label: 'Inventory & Risks', icon: Package },
            { id: 'transfers', label: 'Nearby & Lateral Transfers', icon: ArrowLeftRight },
            { id: 'audit', label: 'Audit Trail', icon: ClipboardCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PhcTab)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isSel
                    ? 'bg-[#0071E3] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-[#1D1D1F]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading facility records...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1: Clinical Footfall */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs">
                    <div className="text-xs font-medium text-gray-500 mb-1">Today's Footfall</div>
                    <div className="text-3xl font-bold tracking-tight text-[#1D1D1F]">
                      {(data?.demand?.opd_patients || 0) + (data?.demand?.emergency_patients || 0)}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                      <span>OPD: {data?.demand?.opd_patients || 0}</span>
                      <span>IPD: {data?.demand?.ipd_patients || 0}</span>
                      <span>Emergency: {data?.demand?.emergency_patients || 0}</span>
                    </div>
                  </div>

                  {/* Metric 2: Bed Occupancy */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs">
                    <div className="text-xs font-medium text-gray-500 mb-1">Bed Occupancy</div>
                    <div className="text-3xl font-bold tracking-tight text-[#1D1D1F]">
                      {Math.round((data?.beds?.occupancy_rate || 0) * 100)}%
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                      <span>Occupied: {data?.beds?.beds_occupied || 0}</span>
                      <span>Available: {data?.beds?.beds_available || 0}</span>
                      <span>Capacity: {data?.beds?.bed_capacity || 10}</span>
                    </div>
                  </div>

                  {/* Metric 3: Staff Readiness */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs">
                    <div className="text-xs font-medium text-gray-500 mb-1">Staff Attendance</div>
                    <div className="text-3xl font-bold tracking-tight text-[#1D1D1F]">
                      {Math.round((data?.staff?.attendance_rate || 0) * 100)}%
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                      <span>Doctors: {data?.staff?.doctors_present || 0}/{data?.staff?.doctors_total || 2}</span>
                      <span>Nurses: {data?.staff?.nurses_present || 0}/{data?.staff?.nurses_total || 4}</span>
                    </div>
                  </div>

                  {/* Metric 4: Stockout Alerts */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs">
                    <div className="text-xs font-medium text-gray-500 mb-1">Critical Stockout Risks</div>
                    <div className="text-3xl font-bold tracking-tight text-rose-600">
                      {data?.risks.filter(r => r.severity === 'CRITICAL').length || 0}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                      <span>High: {data?.risks.filter(r => r.severity === 'HIGH').length || 0}</span>
                      <span>Watch: {data?.risks.filter(r => r.severity === 'WATCH').length || 0}</span>
                      <span>Total Catalog: 20 Items</span>
                    </div>
                  </div>
                </div>

                {/* Facility Details & Quick Action Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Facility Card */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#0071E3]" />
                      Facility Demographic Profile
                    </h3>
                    <div className="divide-y divide-gray-100 text-xs">
                      <div className="py-2.5 flex justify-between">
                        <span className="text-gray-500">Facility Type</span>
                        <span className="font-medium text-gray-900">{data?.phc.facility_type || 'UPHC'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-gray-500">Catchment Population</span>
                        <span className="font-medium text-gray-900">{data?.phc.population_served?.toLocaleString()} Citizens</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-gray-500">LGD District</span>
                        <span className="font-medium text-gray-900">{data?.phc.district_name}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-gray-500">State</span>
                        <span className="font-medium text-gray-900">{data?.phc.state_name}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-gray-500">GPS Coordinates</span>
                        <span className="font-mono text-gray-700">{data?.phc.latitude?.toFixed(4)}, {data?.phc.longitude?.toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900">
                      <strong>ABDM Connected:</strong> Scoped audit logs and stock entries are cryptographically stamped with your operator ID.
                    </div>
                  </div>

                  {/* Stock Risk Highlights */}
                  <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Immediate Action Needed (Top Stockout Risks)
                      </h3>
                      <button
                        onClick={() => setActiveTab('transfers')}
                        className="text-xs text-[#0071E3] hover:underline font-medium cursor-pointer"
                      >
                        Request Lateral Transfers →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                            <th className="pb-2">Medicine</th>
                            <th className="pb-2">Current Stock</th>
                            <th className="pb-2">Days of Stock</th>
                            <th className="pb-2">Risk %</th>
                            <th className="pb-2">Severity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data?.risks.slice(0, 5).map((risk: any) => (
                            <tr key={risk.medicine_id} className="hover:bg-gray-50/60 transition">
                              <td className="py-3 font-medium text-gray-900">
                                {risk.generic_name}
                                <span className="block text-[11px] text-gray-400">{risk.dosage_form} • {risk.category}</span>
                              </td>
                              <td className="py-3 font-semibold text-gray-800">
                                {risk.closing_stock ?? '--'} {risk.unit}
                              </td>
                              <td className="py-3 text-gray-700">
                                {risk.depletion_horizon !== undefined ? `${risk.depletion_horizon} d` : '--'}
                              </td>
                              <td className="py-3">
                                <span className="font-semibold text-gray-900">
                                  {Math.round((risk.risk_probability || 0) * 100)}%
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getSeverityBadgeClass(risk.severity)}`}>
                                  {risk.severity}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DATA ENTRY FORMS */}
            {activeTab === 'data-entry' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form 1: Medicine Stock & Dispensation */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0071E3] flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Medicine Stock & Dispensation</h3>
                      <p className="text-xs text-gray-500">Record daily dispensed, received supplies, or damaged units</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateStock} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Select Medicine</label>
                      <select
                        value={stockMedId}
                        onChange={(e) => setStockMedId(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900"
                      >
                        {medicines.map((m) => (
                          <option key={m.medicine_id} value={m.medicine_id}>
                            {m.generic_name} ({m.dosage_form}) - {m.category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Received (+)</label>
                        <input
                          type="number"
                          min="0"
                          value={stockReceived}
                          onChange={(e) => setStockReceived(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Dispensed (-)</label>
                        <input
                          type="number"
                          min="0"
                          value={stockDispensed}
                          onChange={(e) => setStockDispensed(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Damaged/Loss (-)</label>
                        <input
                          type="number"
                          min="0"
                          value={stockDamaged}
                          onChange={(e) => setStockDamaged(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">
                          Manual Stock Override (Optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Auto-calculated if blank"
                          value={stockClosing}
                          onChange={(e) => setStockClosing(e.target.value)}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Lead Time (Days)</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={stockLeadTime}
                          onChange={(e) => setStockLeadTime(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingStock}
                      className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {submittingStock ? 'Recording...' : 'Record Inventory Transaction'}
                    </button>
                  </form>
                </div>

                {/* Form 2: Clinical Footfall & Demand */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Patient Footfall & Clinical Load</h3>
                      <p className="text-xs text-gray-500">Update today's OPD, IPD, and emergency cases</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateDemand} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">OPD Patients</label>
                        <input
                          type="number"
                          min="0"
                          value={opdCount}
                          onChange={(e) => setOpdCount(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">IPD Patients</label>
                        <input
                          type="number"
                          min="0"
                          value={ipdCount}
                          onChange={(e) => setIpdCount(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Emergency Cases</label>
                        <input
                          type="number"
                          min="0"
                          value={emergCount}
                          onChange={(e) => setEmergCount(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Disease Severity Index (0.5 - 3.0)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3.0"
                          value={diseaseIndex}
                          onChange={(e) => setDiseaseIndex(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingDemand}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {submittingDemand ? 'Updating...' : 'Update Clinical Footfall'}
                    </button>
                  </form>
                </div>

                {/* Form 3: Bed Occupancy & Staff Readiness */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-6">
                  {/* Beds Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Bed Occupancy</h3>
                    <form onSubmit={handleUpdateBeds} className="grid grid-cols-3 gap-3 items-end text-xs">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Bed Capacity</label>
                        <input
                          type="number"
                          min="1"
                          value={bedCapacity}
                          onChange={(e) => setBedCapacity(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Beds Occupied</label>
                        <input
                          type="number"
                          min="0"
                          max={bedCapacity}
                          value={bedsOccupied}
                          onChange={(e) => setBedsOccupied(Number(e.target.value))}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingBeds}
                        className="py-2 px-3 bg-gray-900 hover:bg-black text-white font-medium rounded-xl transition cursor-pointer"
                      >
                        {submittingBeds ? '...' : 'Save Beds'}
                      </button>
                    </form>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Staff Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Staff Attendance</h3>
                    <form onSubmit={handleUpdateStaff} className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-gray-600 mb-1">Doctors Present</label>
                          <input
                            type="number"
                            min="0"
                            value={docPresent}
                            onChange={(e) => setDocPresent(Number(e.target.value))}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-gray-600 mb-1">Nurses Present</label>
                          <input
                            type="number"
                            min="0"
                            value={nurPresent}
                            onChange={(e) => setNurPresent(Number(e.target.value))}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-gray-600 mb-1">Pharmacists Present</label>
                          <input
                            type="number"
                            min="0"
                            value={phmPresent}
                            onChange={(e) => setPhmPresent(Number(e.target.value))}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={submittingStaff}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition cursor-pointer"
                      >
                        {submittingStaff ? '...' : 'Log Staff Attendance'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Form 4: Report Incident Ticket */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Report Facility Incident / Bottleneck</h3>
                      <p className="text-xs text-gray-500">File an official support ticket to district authorities</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-medium text-gray-600 mb-1">Incident Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Paracetamol Syrups batch exhausted"
                        value={ticketTitle}
                        onChange={(e) => setTicketTitle(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Category</label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                        >
                          <option value="MEDICINE_STOCKOUT">Medicine Stockout</option>
                          <option value="STAFF_ABSENTEEISM">Staff Shortage</option>
                          <option value="COLD_CHAIN_FAILURE">Cold Chain / Refrigerator</option>
                          <option value="EQUIPMENT_BREAKDOWN">Diagnostic Equipment</option>
                          <option value="FACILITY_SURGE">Patient Surge</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Priority</label>
                        <select
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-gray-600 mb-1">Detailed Description</label>
                      <textarea
                        rows={3}
                        placeholder="Provide details on batch numbers, patient impact, or needed supplies..."
                        value={ticketDesc}
                        onChange={(e) => setTicketDesc(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingTicket}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl transition cursor-pointer"
                    >
                      {submittingTicket ? 'Filing...' : 'Submit Incident Ticket'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: INVENTORY & RISKS */}
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Facility Stock & Predictive Horizon</h3>
                    <p className="text-xs text-gray-500">Live inventory, ML-derived depletion horizon, and calibrated risk score</p>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {data?.risks.length || 0} Catalogued Medicines
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider font-semibold">
                        <th className="py-3">Medicine & Category</th>
                        <th className="py-3">Closing Stock</th>
                        <th className="py-3">Reorder Point</th>
                        <th className="py-3">Days of Stock</th>
                        <th className="py-3">Stock-Out Risk</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data?.risks.map((item: any) => (
                        <tr key={item.medicine_id} className="hover:bg-gray-50/60 transition">
                          <td className="py-3">
                            <span className="font-semibold text-gray-900">{item.generic_name}</span>
                            <span className="block text-[11px] text-gray-400">{item.dosage_form} • {item.category}</span>
                          </td>
                          <td className="py-3 font-semibold text-gray-800">
                            {item.closing_stock ?? '--'} {item.unit}
                          </td>
                          <td className="py-3 text-gray-500">
                            {item.reorder_level ?? '--'} {item.unit}
                          </td>
                          <td className="py-3 font-medium text-gray-700">
                            {item.depletion_horizon !== undefined ? `${item.depletion_horizon} days` : '--'}
                          </td>
                          <td className="py-3 font-semibold text-gray-900">
                            {Math.round((item.risk_probability || 0) * 100)}%
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getSeverityBadgeClass(item.severity)}`}>
                              {item.severity}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                setStockMedId(item.medicine_id);
                                setActiveTab('data-entry');
                              }}
                              className="px-2.5 py-1 text-xs text-[#0071E3] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              Update Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: NEARBY FACILITIES & LATERAL TRANSFERS */}
            {activeTab === 'transfers' && (
              <div className="space-y-6">
                {/* Transfer Creation Form */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0071E3] flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Request Lateral Stock Transfer</h3>
                      <p className="text-xs text-gray-500">
                        Request surplus medicines directly from nearby facilities within your district
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleRequestTransfer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs items-end">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Source Neighbor PHC</label>
                      <select
                        value={transferTargetPhc}
                        onChange={(e) => setTransferTargetPhc(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                      >
                        {nearbyPhcs.map((n) => (
                          <option key={n.phc_id} value={n.phc_id}>
                            {n.phc_name} ({n.distance_km} km • {n.estimated_transit_hours}h)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Required Medicine</label>
                      <select
                        value={transferMedId}
                        onChange={(e) => setTransferMedId(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                      >
                        {medicines.map((m) => (
                          <option key={m.medicine_id} value={m.medicine_id}>
                            {m.generic_name} ({m.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Requested Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={transferQty}
                        onChange={(e) => setTransferQty(Number(e.target.value))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingTransfer}
                      className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium rounded-xl transition shadow-2xs cursor-pointer"
                    >
                      {submittingTransfer ? 'Dispatching...' : 'Request Stock Transfer'}
                    </button>
                  </form>
                </div>

                {/* Nearby Facilities with Surplus Inventory */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Nearby Facilities & Their Surplus Stock
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nearbyPhcs.map((n) => (
                      <div key={n.phc_id} className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">{n.phc_name}</div>
                            <div className="text-[11px] text-gray-500">{n.distance_km} km away • ~{n.estimated_transit_hours} hrs transit</div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                            District Facility
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-600">
                          <span className="font-medium text-gray-700">Surplus Available:</span>
                          {n.surplus_items && n.surplus_items.length > 0 ? (
                            <ul className="mt-1 space-y-1">
                              {n.surplus_items.map((s, idx) => (
                                <li key={idx} className="flex justify-between text-gray-700">
                                  <span>{s.generic_name}</span>
                                  <span className="font-semibold text-emerald-700">+{s.surplus_quantity}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-gray-400 italic mt-1">Normal operating stock</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Transfers Table */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Active Facility Stock Transfers
                  </h3>

                  {data?.transfers && data.transfers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider font-semibold">
                            <th className="py-3">Transfer ID</th>
                            <th className="py-3">Medicine</th>
                            <th className="py-3">Direction</th>
                            <th className="py-3">Partner Facility</th>
                            <th className="py-3">Quantity</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.transfers.map((t: any) => {
                            const isIncoming = t.destination_phc === phcId;
                            return (
                              <tr key={t.transfer_id} className="hover:bg-gray-50/60 transition">
                                <td className="py-3 font-mono text-gray-600">{t.transfer_id}</td>
                                <td className="py-3 font-semibold text-gray-900">{t.generic_name}</td>
                                <td className="py-3">
                                  {isIncoming ? (
                                    <span className="text-emerald-700 font-medium">← Incoming</span>
                                  ) : (
                                    <span className="text-blue-700 font-medium">→ Outgoing</span>
                                  )}
                                </td>
                                <td className="py-3 text-gray-700">
                                  {isIncoming ? t.source_phc_name : t.destination_phc_name}
                                </td>
                                <td className="py-3 font-semibold text-gray-900">
                                  {t.quantity} {t.unit}
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    t.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    t.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    t.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right space-x-1.5">
                                  {/* Approve / Reject if outgoing and requested */}
                                  {!isIncoming && t.status === 'REQUESTED' && (
                                    <>
                                      <button
                                        onClick={() => handleTransferAction(t.transfer_id, 'APPROVE')}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleTransferAction(t.transfer_id, 'REJECT')}
                                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {/* Dispatch if outgoing and approved */}
                                  {!isIncoming && t.status === 'APPROVED' && (
                                    <button
                                      onClick={() => handleTransferAction(t.transfer_id, 'DISPATCH')}
                                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] cursor-pointer"
                                    >
                                      Dispatch Stock
                                    </button>
                                  )}
                                  {/* Receive if incoming and in-transit */}
                                  {isIncoming && t.status === 'IN_TRANSIT' && (
                                    <button
                                      onClick={() => handleTransferAction(t.transfer_id, 'RECEIVE')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] cursor-pointer"
                                    >
                                      Confirm Receipt
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No active lateral transfers for this facility yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: AUDIT TRAIL */}
            {activeTab === 'audit' && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Immutable Audit Log</h3>
                    <p className="text-xs text-gray-500">Cryptographically verifiable log of all transactions committed at this facility</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Audit Chain Active</span>
                  </div>
                </div>

                {data?.audit_history && data.audit_history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider font-semibold">
                          <th className="py-3">Timestamp</th>
                          <th className="py-3">User</th>
                          <th className="py-3">Action</th>
                          <th className="py-3">Data Domain</th>
                          <th className="py-3">Changes (Previous → New)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.audit_history.map((log: any) => (
                          <tr key={log.id} className="hover:bg-gray-50/60 transition">
                            <td className="py-3 text-gray-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 font-medium text-gray-900">{log.username}</td>
                            <td className="py-3">
                              <span className="font-semibold text-gray-800">{log.action}</span>
                            </td>
                            <td className="py-3 text-gray-600">{log.data_type}</td>
                            <td className="py-3 text-[11px] font-mono text-gray-600 max-w-md truncate">
                              {log.previous_value ? JSON.stringify(log.previous_value) : 'None'} → {JSON.stringify(log.new_value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    No transactions logged for this facility yet.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
