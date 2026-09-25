import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Pill, ShieldCheck, TrendingUp, AlertTriangle, Truck } from 'lucide-react';
import { MedicineRecord, InventoryRow } from '../types';
import { api } from '../services/api';

interface Props {
  onSelectPhc?: (phcId: string) => void;
  onNavigateTab?: (tab: any) => void;
  onOpenMedicineDrawer?: (medicine: any) => void;
  onOpenRiskDrawer?: (risk: any) => void;
}

export const MedicineControlTower: React.FC<Props> = ({
  onSelectPhc,
  onNavigateTab,
  onOpenMedicineDrawer,
  onOpenRiskDrawer,
}) => {
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedicineRecord | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeds();
  }, []);

  const loadMeds = async () => {
    setLoading(true);
    try {
      const data = await api.getMedicines();
      setMedicines(data);
      if (data.length > 0) {
        setSelectedMed(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeds = medicines.filter(
    (m) =>
      m.generic_name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            Medicine Supply
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Essential NLEM Drug Formulary & Regional Pipeline Tracking
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search medicine or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white pl-10 pr-4 py-2.5 rounded-full text-xs text-[#1D1D1F] placeholder-black/40 border border-black/6 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
          />
        </div>
      </section>

      {/* Selected Medicine Hero Card */}
      {selectedMed && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/5">
            <div>
              <span className="text-xs font-semibold uppercase text-black/40">
                Selected Essential Drug • {selectedMed.category}
              </span>
              <h2 className="text-3xl font-extrabold text-[#1D1D1F] tracking-tight mt-0.5">
                {selectedMed.generic_name}
              </h2>
              <div className="text-xs text-black/50 font-mono mt-0.5">
                ID: {selectedMed.medicine_id} • Unit: {selectedMed.unit} • Formulation: {selectedMed.dosage_form}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-3xl font-black text-[#007AFF] font-mono">
                1,248,000
              </div>
              <span className="text-xs text-black/50 font-medium">
                units across 208 monitored facilities
              </span>
            </div>
          </div>

          {/* Smooth Horizontal Supply Flow Diagram */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-black/40 mb-3">
              Supply Chain Pipeline Flow
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-4 bg-[#F8F8FA] rounded-2xl relative">
                <span className="text-[11px] font-bold uppercase text-black/40">1. Supply</span>
                <div className="text-sm font-bold text-[#1D1D1F] mt-1">State Warehouses</div>
                <div className="text-xs text-[#34C759] font-mono mt-0.5">+4.2M units buffer</div>
              </div>
              <div className="p-4 bg-[#F8F8FA] rounded-2xl relative">
                <span className="text-[11px] font-bold uppercase text-black/40">2. Distribution</span>
                <div className="text-sm font-bold text-[#1D1D1F] mt-1">District Hubs</div>
                <div className="text-xs text-[#007AFF] font-mono mt-0.5">3.5 day lead time</div>
              </div>
              <div className="p-4 bg-[#F8F8FA] rounded-2xl relative">
                <span className="text-[11px] font-bold uppercase text-black/40">3. Facilities</span>
                <div className="text-sm font-bold text-[#1D1D1F] mt-1">208 PHCs</div>
                <div className="text-xs text-[#1D1D1F] font-mono mt-0.5">82% normal stock</div>
              </div>
              <div className="p-4 bg-[#F8F8FA] rounded-2xl relative">
                <span className="text-[11px] font-bold uppercase text-black/40">4. Consumption</span>
                <div className="text-sm font-bold text-[#1D1D1F] mt-1">Daily Outpatients</div>
                <div className="text-xs text-black/50 font-mono mt-0.5">48,200 units / day</div>
              </div>
            </div>
          </div>

          {/* Key Insights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-[#F8F8FA] rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs text-black/40 font-semibold uppercase">
                <TrendingUp className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Demand Forecast</span>
              </div>
              <div className="text-xl font-bold text-[#1D1D1F] mt-1">Stable (+4% 7d)</div>
              <p className="text-xs text-black/50 mt-0.5">No abnormal epidemiological surge detected</p>
            </div>

            <div className="p-4 bg-[#F8F8FA] rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs text-black/40 font-semibold uppercase">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF9500]" />
                <span>Stock-Out Risk</span>
              </div>
              <div className="text-xl font-bold text-[#FF9500] mt-1">3 PHCs Below Buffer</div>
              <p className="text-xs text-black/50 mt-0.5">Lateral transfer recommended</p>
            </div>

            <div className="p-4 bg-[#F8F8FA] rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs text-black/40 font-semibold uppercase">
                <Truck className="w-3.5 h-3.5 text-[#34C759]" />
                <span>Lead Time</span>
              </div>
              <div className="text-xl font-bold text-[#34C759] mt-1">{selectedMed.lead_time_days || 4} Days</div>
              <p className="text-xs text-black/50 mt-0.5">Central warehouse delivery cycle</p>
            </div>
          </div>
        </section>
      )}

      {/* Medicine Selection Carousel / Pills */}
      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Select Formulary Item
          </div>
          <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            Essential Medicines Catalogue
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredMeds.map((med) => {
            const isSelected = selectedMed?.medicine_id === med.medicine_id;
            return (
              <motion.div
                key={med.medicine_id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedMed(med)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-[#007AFF] text-white shadow-md border-transparent'
                    : 'bg-white text-[#1D1D1F] border-black/4 hover:shadow-sm'
                }`}
              >
                <Pill className={`w-5 h-5 mb-2 ${isSelected ? 'text-white' : 'text-[#007AFF]'}`} />
                <div className="font-bold text-sm truncate">{med.generic_name}</div>
                <div className={`text-[11px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-black/40'}`}>
                  {med.category}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
