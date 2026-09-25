import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, MapPin, Activity, ShieldCheck } from 'lucide-react';
import { StateRecord, DistrictRecord, NationalKPIs } from '../types';
import { api } from '../services/api';

interface Props {
  selectedStateId: string;
  onSelectState: (stateId: string) => void;
  onSelectDistrict: (districtId: string) => void;
  onBackToNational?: () => void;
}

export const StateView: React.FC<Props> = ({
  selectedStateId,
  onSelectState,
  onSelectDistrict,
  onBackToNational,
}) => {
  const [states, setStates] = useState<StateRecord[]>([]);
  const [districts, setDistricts] = useState<DistrictRecord[]>([]);
  const [kpis, setKpis] = useState<NationalKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    if (selectedStateId) {
      loadStateData(selectedStateId);
    }
  }, [selectedStateId]);

  const loadStates = async () => {
    try {
      const data = await api.getStates();
      setStates(data);
      if (!selectedStateId && data.length > 0) {
        onSelectState(data[0].state_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStateData = async (stateId: string) => {
    setLoading(true);
    try {
      const [distData, kpiData] = await Promise.all([
        api.getDistricts(stateId),
        api.getNationalKpis(stateId),
      ]);
      setDistricts(distData);
      setKpis(kpiData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentState = states.find((s) => s.state_id === selectedStateId);

  // Status mapping for districts
  const getDistrictStatus = (distName: string) => {
    if (distName.includes('Pune')) return { label: 'Healthy', color: '#34C759', bg: '#EAF8EE', dot: '#34C759' };
    if (distName.includes('Nagpur') || distName.includes('Jaipur') || distName.includes('Lucknow')) {
      return { label: 'Moderate pressure', color: '#FF9500', bg: '#FFF5E5', dot: '#FF9500' };
    }
    if (distName.includes('Nashik') || distName.includes('Jodhpur') || distName.includes('Belagavi')) {
      return { label: 'Critical alert', color: '#FF3B30', bg: '#FFEAEA', dot: '#FF3B30' };
    }
    return { label: 'Optimal', color: '#007AFF', bg: '#E5F1FF', dot: '#007AFF' };
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header with state switcher pills */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          {onBackToNational && (
            <button
              onClick={onBackToNational}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] hover:underline mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>National Command</span>
            </button>
          )}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            {currentState?.state_name || 'Maharashtra'}
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            State Health Operations • {districts.length} Monitored Districts
          </p>
        </div>

        {/* State Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {states.map((st) => (
            <button
              key={st.state_id}
              onClick={() => onSelectState(st.state_id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedStateId === st.state_id
                  ? 'bg-[#1D1D1F] text-white shadow-xs'
                  : 'bg-white text-black/60 hover:text-black border border-black/5 hover:bg-[#F5F5F7]'
              }`}
            >
              {st.state_name}
            </button>
          ))}
        </div>
      </section>

      {/* State Hero Map & Summary Canvas */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Stylized State Graphic */}
          <div className="lg:col-span-1 flex items-center justify-center p-6 bg-[#F8F8FA] rounded-2xl">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
                <MapPin className="w-10 h-10" />
              </div>
              <div className="font-bold text-lg text-[#1D1D1F]">{currentState?.state_name}</div>
              <div className="text-xs text-black/40 font-mono">LGD Code: {currentState?.lgd_state_code}</div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-[#F8F8FA] rounded-2xl">
              <span className="text-xs font-semibold uppercase text-black/40">Districts</span>
              <div className="text-3xl font-extrabold text-[#1D1D1F] mt-1">{districts.length}</div>
            </div>
            <div className="p-4 bg-[#F8F8FA] rounded-2xl">
              <span className="text-xs font-semibold uppercase text-black/40">PHCs</span>
              <div className="text-3xl font-extrabold text-[#007AFF] mt-1">{districts.length * 8}</div>
            </div>
            <div className="p-4 bg-[#F8F8FA] rounded-2xl">
              <span className="text-xs font-semibold uppercase text-black/40">Critical Risks</span>
              <div className="text-3xl font-extrabold text-[#FF3B30] mt-1">
                {kpis?.stockout_summary.critical_stockouts || 3}
              </div>
            </div>
            <div className="p-4 bg-[#F8F8FA] rounded-2xl">
              <span className="text-xs font-semibold uppercase text-black/40">Staff Duty</span>
              <div className="text-3xl font-extrabold text-[#34C759] mt-1">94%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Flowing District Breakdown Rows */}
      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Regional Breakdown
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            Districts
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-black/40 text-xs">Loading state telemetry...</div>
        ) : (
          <div className="space-y-2.5">
            {districts.map((dist, idx) => {
              const status = getDistrictStatus(dist.district_name);

              return (
                <motion.div
                  key={dist.district_id}
                  whileHover={{ y: -1.5 }}
                  onClick={() => onSelectDistrict(dist.district_id)}
                  className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-black/4 hover:shadow-md transition-all flex items-center justify-between gap-4 cursor-pointer"
                >
                  {/* Left: District name + status dot */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.dot }}
                    />
                    <div>
                      <div className="font-bold text-base text-[#1D1D1F]">
                        {dist.district_name}
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Center: Metrics strip */}
                  <div className="hidden sm:flex items-center gap-8 text-xs text-black/60">
                    <div>
                      <span className="text-black/40 block text-[10px] uppercase font-bold">Demand</span>
                      <span className="font-bold text-[#1D1D1F] font-mono">1,420 OPD</span>
                    </div>
                    <div>
                      <span className="text-black/40 block text-[10px] uppercase font-bold">Medicine Coverage</span>
                      <span className="font-bold text-[#34C759] font-mono">92%</span>
                    </div>
                    <div>
                      <span className="text-black/40 block text-[10px] uppercase font-bold">Beds</span>
                      <span className="font-bold text-[#007AFF] font-mono">68%</span>
                    </div>
                  </div>

                  {/* Right: Chevron */}
                  <ChevronRight className="w-5 h-5 text-black/30 group-hover:text-black transition-colors" />
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
