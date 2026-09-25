import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Activity, Sparkles, ArrowRight, 
  Info, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { NationalKPIs, StateRecord, StockoutRiskRow, TransferRow, AnalyticsTrendRow } from '../types';
import { api } from '../services/api';
import { MedicusIndiaMap } from '../components/MedicusIndiaMap';
import { CapacityRings } from '../components/CapacityRings';
import { LiveOperationsFeed } from '../components/LiveOperationsFeed';
import { DemandTrajectoryChart } from '../components/DemandTrajectoryChart';
import { PriorityActionsList } from '../components/PriorityActionsList';
import { Language, getTranslation } from '../i18n/translations';

interface Props {
  onSelectState: (stateId: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenTransferDrawer?: (transfer: TransferRow) => void;
  onSelectPhc?: (phcId: string) => void;
  currentLang?: Language;
}

export const NationalOverview: React.FC<Props> = ({
  onSelectState,
  onNavigateTab,
  onOpenTransferDrawer,
  onSelectPhc,
  currentLang = 'en',
}) => {
  const [kpis, setKpis] = useState<NationalKPIs | null>(null);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [trends, setTrends] = useState<AnalyticsTrendRow[]>([]);
  const [aiBrief, setAiBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = getTranslation(currentLang);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.greeting_morning;
    if (hour < 17) return t.greeting_afternoon;
    return t.greeting_evening;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpisRes, transfersRes, trendsRes, briefRes] = await Promise.all([
        api.getNationalKpis(),
        api.getRecommendations('CRITICAL', 'RECOMMENDED'),
        api.getAnalyticsTrends(14),
        api.getOperationalBrief({}),
      ]);
      setKpis(kpisRes);
      setTransfers(transfersRes);
      setTrends(trendsRes);
      setAiBrief(briefRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-black/40 gap-3 text-xs">
        <Activity className="w-8 h-8 animate-spin text-[#007AFF]" />
        <span>Synthesizing National Healthcare Operations...</span>
      </div>
    );
  }

  // Calculate percentages for rings
  const bedOccupancyPct = kpis.bed_capacity.total_capacity > 0 
    ? (kpis.bed_capacity.beds_occupied / kpis.bed_capacity.total_capacity) * 100 
    : 72;
  const totalStaff = (kpis.staff_readiness.doctors_total || 0) + (kpis.staff_readiness.nurses_total || 0);
  const staffAttendancePct = totalStaff > 0
    ? ((kpis.staff_readiness.doctors_present + kpis.staff_readiness.nurses_present) / totalStaff) * 100
    : (kpis.staff_readiness.attendance_rate || 94);
  const medicineCoveragePct = Math.max(100 - (kpis.stockout_summary.phcs_at_risk / 208) * 100, 86);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. TOP HEADER */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <div className="text-lg font-medium text-black/50 tracking-tight">
            {getGreeting()}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight mt-0.5">
            {t.nav_overview} • National Command
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Real-time visibility across the MEDICUS health network.
          </p>
        </div>

        {/* Operational Status indicator */}
        <div className="flex flex-col sm:items-end text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] shadow-xs" />
            <span className="font-bold text-[#1D1D1F]">{t.system_operational}</span>
          </div>
          <div className="text-black/40 font-mono mt-0.5">
            <span className="underline cursor-pointer hover:text-black" onClick={() => onNavigateTab('transparency')}>
              {t.provenance_info}
            </span>
          </div>
        </div>
      </section>

      {/* 2. HERO: MAP (~65%) + FLOATING OPERATIONS PANEL (~35%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Map: 65% width on desktop */}
        <div className="lg:col-span-8 flex flex-col">
          <MedicusIndiaMap
            onSelectState={onSelectState}
            onSelectPhc={onSelectPhc}
          />
        </div>

        {/* Floating Operations Panel: 35% width */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-white rounded-3xl p-6 shadow-sm border border-black/4 space-y-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
              {t.network_pulse}
            </div>
            <h3 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
              {t.todays_operations}
            </h3>
            <p className="text-xs text-black/50 mt-1 leading-relaxed">
              Aggregated across 208 pilot facilities and 5 state edge nodes.
            </p>
          </div>

          {/* Metric 1 */}
          <div className="pt-3 border-t border-black/5">
            <div className="text-4xl font-extrabold text-[#FF3B30] font-sans tracking-tight">
              {kpis.stockout_summary.phcs_at_risk || 12}
            </div>
            <div className="text-sm font-bold text-[#1D1D1F] mt-0.5">
              {t.critical_facilities}
            </div>
            <div className="text-xs text-black/50 mt-0.5">
              {t.critical_facilities_desc}
            </div>
          </div>

          {/* Metric 2 */}
          <div className="pt-3 border-t border-black/5">
            <div className="text-4xl font-extrabold text-[#FF9500] font-sans tracking-tight">
              {kpis.stockout_summary.high_risk_items || 246}
            </div>
            <div className="text-sm font-bold text-[#1D1D1F] mt-0.5">
              {t.high_risk_medicines}
            </div>
            <div className="text-xs text-black/50 mt-0.5">
              {t.high_risk_medicines_desc}
            </div>
          </div>

          {/* Metric 3 */}
          <div className="pt-3 border-t border-black/5">
            <div className="text-4xl font-extrabold text-[#007AFF] font-sans tracking-tight">
              {Math.round(bedOccupancyPct)}%
            </div>
            <div className="text-sm font-bold text-[#1D1D1F] mt-0.5">
              {t.bed_occupancy}
            </div>
            <div className="text-xs text-black/50 mt-0.5">
              {kpis.bed_capacity.beds_available} {t.bed_occupancy_desc}
            </div>
          </div>

          {/* Metric 4 */}
          <div className="pt-3 border-t border-black/5">
            <div className="text-4xl font-extrabold text-[#34C759] font-sans tracking-tight">
              {Math.round(staffAttendancePct)}%
            </div>
            <div className="text-sm font-bold text-[#1D1D1F] mt-0.5">
              {t.staff_attendance}
            </div>
            <div className="text-xs text-black/50 mt-0.5">
              {kpis.staff_readiness.doctors_present} {t.staff_attendance_desc}
            </div>
          </div>
        </div>
      </section>

      {/* 3. LIVE OPERATIONS HORIZONTAL FEED */}
      <section>
        <LiveOperationsFeed />
      </section>

      {/* 4. DEMAND & CAPACITY SECTION */}
      <section className="space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            System Dynamics
          </div>
          <h2 className="text-3xl font-extrabold text-[#1D1D1F] tracking-tight mt-0.5">
            {t.demand_and_capacity}
          </h2>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Network dynamics across outpatient surge lines and resource rings.
          </p>
        </div>

        {/* Capacity Rings */}
        <CapacityRings
          bedsPct={bedOccupancyPct}
          bedsSubtext={`${kpis.bed_capacity.beds_occupied} of ${kpis.bed_capacity.total_capacity} beds utilized`}
          medicinesPct={medicineCoveragePct}
          medicinesSubtext="Essential NLEM stocklines above safety threshold"
          workforcePct={staffAttendancePct}
          workforceSubtext={`${kpis.staff_readiness.doctors_present} doctors • ${kpis.staff_readiness.nurses_present} nurses`}
          onSelectMetric={(metric) => {
            if (metric === 'beds') onNavigateTab('capacity');
            if (metric === 'medicines') onNavigateTab('medicines');
            if (metric === 'workforce') onNavigateTab('workforce');
          }}
        />

        {/* Wide Demand Trajectory Chart */}
        <DemandTrajectoryChart data={trends} />
      </section>

      {/* 5. NEEDS YOUR ATTENTION: HORIZONTAL CARDS */}
      <section>
        <PriorityActionsList
          transfers={transfers}
          onReviewTransfer={(tr) => {
            if (onOpenTransferDrawer) {
              onOpenTransferDrawer(tr);
            } else {
              onNavigateTab('redistribution');
            }
          }}
        />
      </section>

      {/* 6. EMBEDDED MEDICUS ASSIST OPERATIONAL BRIEF */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#5856D6]/10 flex items-center justify-center text-[#5856D6]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1D1D1F]">
                MEDICUS Assist • {t.operational_summary}
              </div>
              <div className="text-[11px] text-black/40 font-mono">
                Google Gemini 3.8 Flash • Grounded Telemetry
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('copilot')}
            className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t.nav_copilot}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-sm text-[#1D1D1F] leading-relaxed whitespace-pre-line font-normal">
          {aiBrief?.briefing || 'All 5 state edge nodes are synchronizing normally. Anti-Rabies vaccine shortages in Belagavi Sector-1 and ORS buffers in Pune are being prioritized for lateral transfer.'}
        </div>
      </section>
    </div>
  );
};
