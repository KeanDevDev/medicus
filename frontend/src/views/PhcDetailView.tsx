import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Clock, Stethoscope, ChevronRight, Activity, 
  ShieldCheck, Pill, AlertTriangle, CheckCircle2, Search,
  Users, BedDouble, TrendingUp, Truck, Filter
} from 'lucide-react';
import { PhcRecord } from '../types';
import { api } from '../services/api';

interface Props {
  selectedPhcId: string;
  onBackToDistrict: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenMedicineDrawer?: (medicine: any) => void;
  onOpenRiskDrawer?: (risk: any) => void;
}

export const PhcDetailView: React.FC<Props> = ({
  selectedPhcId,
  onBackToDistrict,
  onNavigateTab,
  onOpenMedicineDrawer,
  onOpenRiskDrawer,
}) => {
  const [phc, setPhc] = useState<PhcRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  useEffect(() => {
    if (selectedPhcId) {
      loadPhc(selectedPhcId);
    }
  }, [selectedPhcId]);

  const loadPhc = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getPhcDetail(id);
      setPhc(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !phc) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-black/40 gap-3 text-xs">
        <Activity className="w-8 h-8 animate-spin text-[#007AFF]" />
        <span>Loading Facility Operational Profile...</span>
      </div>
    );
  }

  const risks = phc.inventory_risks || [];
  const latestDemand = phc.latest_demand;
  const latestBeds = phc.latest_beds;
  const latestStaff = phc.latest_staff;

  const totalPatientsToday = (latestDemand?.opd_patients || 0) + (latestDemand?.ipd_patients || 0) + (latestDemand?.emergency_patients || 0);
  const bedOccupancyRate = latestBeds?.occupancy_rate || (latestBeds ? Math.round((latestBeds.occupied_beds / (latestBeds.total_beds || 1)) * 100) : 70);
  const staffAttendance = latestStaff?.attendance_pct || 92;

  const filteredRisks = risks.filter((r) => {
    const matchesSearch = !searchQuery || 
      r.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSev = filterSeverity === 'ALL' || r.severity === filterSeverity;
    return matchesSearch && matchesSev;
  });

  const criticalItems = risks.filter(r => r.severity === 'CRITICAL');
  const highRiskItems = risks.filter(r => r.severity === 'HIGH');

  const timelineEvents = [
    { time: '08:00', title: 'Clinical Shift Commenced', desc: `${latestStaff?.doctors_present || 2} Medical Officers & ${latestStaff?.nurses_present || 4} Staff Nurses active on duty.` },
    { time: '09:30', title: 'OPD Surge Registered', desc: `${latestDemand?.opd_patients || 142} outpatients registered; acute fever & GI admissions elevated.` },
    { time: '11:15', title: 'Inventory Reorder Alert Triggered', desc: criticalItems.length > 0 ? `${criticalItems[0]?.generic_name} stock dropped below safety threshold.` : 'All stock lines monitored.' },
    { time: '12:00', title: 'ML 7-Day Forecast Synchronized', desc: 'Demand confidence bounds updated via regional edge node.' },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Top Facility Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <button
            onClick={onBackToDistrict}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>District Facilities</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
              {phc.phc_name}
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF8EE] text-[#34C759] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              <span>Operational</span>
            </span>
          </div>
          <p className="text-sm text-black/60 mt-1 font-medium font-mono">
            {phc.phc_id} • Catchment: {phc.population_served?.toLocaleString()} population • {phc.facility_type}
          </p>
        </div>

        {/* Quick Nav / Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('redistribution')}
            className="px-4 py-2 bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold rounded-full shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Redistribution Desk</span>
          </button>
          <button
            onClick={() => onNavigateTab('copilot')}
            className="px-4 py-2 bg-white hover:bg-black/5 text-[#1D1D1F] text-xs font-semibold rounded-full border border-black/8 shadow-xs transition-colors cursor-pointer"
          >
            <span>Ask MEDICUS Assist</span>
          </button>
        </div>
      </section>

      {/* Critical Needs Attention Banner if items are critical */}
      {criticalItems.length > 0 && (
        <section className="p-5 bg-[#FFEAEA] border border-[#FF3B30]/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-[#1D1D1F] flex items-center gap-2">
                <span>Critical Supply Deficit Detected</span>
                <span className="text-[10px] bg-[#FF3B30] text-white font-bold px-2 py-0.5 rounded-full uppercase">
                  {criticalItems.length} Critical Items
                </span>
              </div>
              <p className="text-xs text-black/60 mt-0.5">
                {criticalItems.map(c => c.generic_name).join(', ')} will stock out in &lt;2 days without lateral replenishment.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('redistribution')}
            className="px-5 py-2 bg-[#FF3B30] hover:bg-[#E02D22] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            Review Urgent Transfers
          </button>
        </section>
      )}

      {/* Operational Telemetry Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
          <span className="text-xs font-semibold uppercase text-black/40">Patients Today</span>
          <div className="text-4xl font-extrabold text-[#1D1D1F] tracking-tight mt-1">
            {totalPatientsToday || 184}
          </div>
          <span className="text-xs text-[#34C759] font-medium mt-1 block">
            {latestDemand?.opd_patients || 140} OPD • {latestDemand?.ipd_patients || 12} IPD
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
          <span className="text-xs font-semibold uppercase text-black/40">Bed Capacity</span>
          <div className="text-4xl font-extrabold text-[#007AFF] tracking-tight mt-1">
            {Math.round(bedOccupancyRate)}%
          </div>
          <span className="text-xs text-black/50 font-medium mt-1 block">
            {latestBeds?.available_beds ?? 4} of {latestBeds?.total_beds ?? 12} beds available
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
          <span className="text-xs font-semibold uppercase text-black/40">Clinical Staff</span>
          <div className="text-4xl font-extrabold text-[#5856D6] tracking-tight mt-1">
            {Math.round(staffAttendance)}%
          </div>
          <span className="text-xs text-black/50 font-medium mt-1 block">
            {latestStaff?.doctors_present ?? 2} Doctors • {latestStaff?.nurses_present ?? 4} Nurses
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
          <span className="text-xs font-semibold uppercase text-black/40">Stock Status</span>
          <div className={`text-4xl font-extrabold tracking-tight mt-1 ${criticalItems.length > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
            {risks.length - criticalItems.length}/{risks.length || 10}
          </div>
          <span className="text-xs text-black/50 font-medium mt-1 block">
            {criticalItems.length} critical • {highRiskItems.length} watch
          </span>
        </div>
      </section>

      {/* Searchable Medicine Inventory Table */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
              Essential Formulary Inventory
            </div>
            <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
              Medicine Stock & 7-Day Demand Forecast
            </h2>
          </div>

          {/* Table Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drug or category..."
                className="bg-white border border-black/8 rounded-full pl-8 pr-4 py-1.5 text-xs text-[#1D1D1F] placeholder-black/40 focus:outline-none w-44 sm:w-56"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-white border border-black/8 rounded-full px-3 py-1.5 text-xs text-[#1D1D1F] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical (&lt;2d)</option>
              <option value="HIGH">High (2-5d)</option>
              <option value="WATCH">Watch (5-7d)</option>
              <option value="NORMAL">Normal (&gt;7d)</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-3xl shadow-sm border border-black/4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8FA] border-b border-black/4 text-black/50 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Medicine</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Current Stock</th>
                  <th className="px-6 py-3.5">Supply Buffer (Days)</th>
                  <th className="px-4 py-3.5">7-Day Forecast [L, U]</th>
                  <th className="px-4 py-3.5">Burn Rate</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {filteredRisks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-black/40">
                      No matching medicine inventory lines found.
                    </td>
                  </tr>
                ) : (
                  filteredRisks.map((item) => {
                    const isCritical = item.severity === 'CRITICAL';
                    const isHigh = item.severity === 'HIGH';
                    const progressPct = Math.min(((item.days_of_stock || 1) / 14) * 100, 100);

                    return (
                      <tr key={item.medicine_id} className="hover:bg-[#F9F9FB] transition-colors">
                        <td className="px-6 py-4">
                          <div 
                            onClick={() => onOpenMedicineDrawer && onOpenMedicineDrawer(item)}
                            className="font-bold text-[#1D1D1F] hover:text-[#007AFF] cursor-pointer"
                          >
                            {item.generic_name}
                          </div>
                          <div className="text-[11px] text-black/40 font-mono">{item.dosage_form || 'Tablet'} • {item.unit || 'units'}</div>
                        </td>
                        <td className="px-4 py-4 text-black/70">
                          {item.category || 'Essential'}
                        </td>
                        <td className="px-4 py-4 font-mono font-bold text-[#1D1D1F]">
                          {item.closing_stock ?? item.quantity ?? 120} {item.unit}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`font-mono font-bold text-xs ${isCritical ? 'text-[#FF3B30]' : isHigh ? 'text-[#FF9500]' : 'text-[#34C759]'}`}>
                              {(item.days_of_stock || 1.8).toFixed(1)}d
                            </span>
                            <div className="w-24 h-2 bg-[#F0F0F2] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCritical ? 'bg-[#FF3B30]' : isHigh ? 'bg-[#FF9500]' : 'bg-[#34C759]'}`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-black/70">
                          <span className="font-semibold text-black">{item.predicted_demand || 240}</span>
                          <span className="text-[10px] text-black/40 block">[{item.lower_bound || 190}, {item.upper_bound || 290}]</span>
                        </td>
                        <td className="px-4 py-4 font-mono text-black/60">
                          {(item.avg_daily_dispensed || 18.5).toFixed(1)}/day
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            isCritical ? 'bg-[#FFEAEA] text-[#FF3B30]' : isHigh ? 'bg-[#FFF5E5] text-[#FF9500]' : 'bg-[#EAF8EE] text-[#34C759]'
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => onOpenRiskDrawer && onOpenRiskDrawer(item)}
                            className="text-[#007AFF] hover:underline font-semibold text-xs cursor-pointer"
                          >
                            Inspect ⓘ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Clinical Shift Timeline */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Shift Telemetry
          </div>
          <h2 className="text-xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            Operational Activity Sequence
          </h2>
        </div>

        <div className="space-y-3">
          {timelineEvents.map((evt, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-2xl bg-[#F8F8FA] text-xs"
            >
              <span className="font-mono font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-1 rounded-full text-xs">
                {evt.time}
              </span>
              <div>
                <div className="font-bold text-[#1D1D1F] text-sm">{evt.title}</div>
                <div className="text-black/60 mt-0.5">{evt.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
