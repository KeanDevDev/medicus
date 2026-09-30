import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, MapPin, Activity, Stethoscope, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DistrictRecord, PhcRecord } from '../types';
import { api } from '../services/api';
import { GooglePhcMap } from '../components/GooglePhcMap';

interface Props {
  selectedDistrictId: string;
  onSelectDistrict: (districtId: string) => void;
  onSelectPhc: (phcId: string) => void;
  onBackToState?: () => void;
}

export const DistrictView: React.FC<Props> = ({
  selectedDistrictId,
  onSelectDistrict,
  onSelectPhc,
  onBackToState,
}) => {
  const [districts, setDistricts] = useState<DistrictRecord[]>([]);
  const [phcs, setPhcs] = useState<PhcRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDistricts();
  }, []);

  useEffect(() => {
    if (selectedDistrictId) {
      loadPhcs(selectedDistrictId);
    }
  }, [selectedDistrictId]);

  const loadDistricts = async () => {
    try {
      const data = await api.getDistricts();
      setDistricts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPhcs = async (districtId: string) => {
    setLoading(true);
    try {
      const data = await api.getPhcs(undefined, districtId);
      setPhcs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentDistrict = districts.find((d) => d.district_id === selectedDistrictId);

  return (
    <div className="space-y-10 pb-16">
      {/* Top Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          {onBackToState && (
            <button
              onClick={onBackToState}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] hover:underline mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>State Dashboard</span>
            </button>
          )}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            {currentDistrict?.district_name || 'Pune'}
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            District Operations • {phcs.length} Primary Health Centres Monitored
          </p>
        </div>

        {/* District Switcher Pills with mouse wheel horizontal scroll */}
        <div 
          onWheel={(e) => {
            if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
          }}
          className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-xl"
        >
          {districts.slice(0, 8).map((d) => (
            <button
              key={d.district_id}
              onClick={() => onSelectDistrict(d.district_id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedDistrictId === d.district_id
                  ? 'bg-[#1D1D1F] text-white shadow-xs'
                  : 'bg-white text-black/60 hover:text-black border border-black/5 hover:bg-[#F5F5F7]'
              }`}
            >
              {d.district_name}
            </button>
          ))}
        </div>
      </section>

      {/* Geographic Facility Google Map */}
      <section>
        <GooglePhcMap
          phcs={phcs}
          selectedDistrictId={selectedDistrictId}
          onSelectPhc={onSelectPhc}
          height="440px"
          title={`${currentDistrict?.district_name || 'District'} Primary Health Facilities`}
          subtitle={`Geographic positioning and live supply status across ${phcs.length} monitored facilities`}
          showFilters={true}
        />
      </section>

      {/* Primary Health Facility Cards */}
      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Real-Time Activity
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            Facility activity
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-black/40 text-xs">Loading facility telemetry...</div>
        ) : (
          <div className="space-y-2.5">
            {phcs.map((phc, idx) => {
              const isCritical = idx === 0;
              const isWarning = idx === 1;

              return (
                <motion.div
                  key={phc.phc_id}
                  whileHover={{ y: -1.5 }}
                  onClick={() => onSelectPhc(phc.phc_id)}
                  className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-black/4 hover:shadow-md transition-all flex items-center justify-between gap-4 cursor-pointer"
                >
                  {/* Left: PHC Name & Status */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isCritical ? 'bg-[#FF3B30] animate-pulse' : isWarning ? 'bg-[#FF9500]' : 'bg-[#34C759]'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-base text-[#1D1D1F]">
                        {phc.phc_name}
                      </div>
                      <div className="text-xs text-black/40 font-mono mt-0.5">
                        {phc.phc_id} • Catchment: {phc.population_served.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Center: Metrics Strip */}
                  <div className="hidden md:flex items-center gap-8 text-xs text-black/60">
                    <div>
                      <span className="text-black/40 block text-[10px] uppercase font-bold">Patients today</span>
                      <span className="font-bold text-[#1D1D1F] font-mono">1,284</span>
                    </div>
                    <div>
                      <span className="text-black/40 block text-[10px] uppercase font-bold">Medicine Avail</span>
                      <span className="font-bold text-[#34C759] font-mono">{isCritical ? '64%' : '88%'}</span>
                    </div>
                    <div>
                      <span className="text-black/40 block text-[10px] uppercase font-bold">Beds</span>
                      <span className="font-bold text-[#007AFF] font-mono">70%</span>
                    </div>
                    <div>
                      <span className="text-black/40 block text-[10px] uppercase font-bold">Staff</span>
                      <span className="font-bold text-[#1D1D1F] font-mono">95%</span>
                    </div>
                  </div>

                  {/* Right: Risk Badge & Chevron */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                        isCritical
                          ? 'bg-[#FFEAEA] text-[#FF3B30]'
                          : isWarning
                          ? 'bg-[#FFF5E5] text-[#FF9500]'
                          : 'bg-[#EAF8EE] text-[#34C759]'
                      }`}
                    >
                      {isCritical ? 'CRITICAL' : isWarning ? 'WATCH' : 'NORMAL'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-black/30 group-hover:text-black transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
