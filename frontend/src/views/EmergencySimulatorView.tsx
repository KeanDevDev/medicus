import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ArrowRight, Zap, TrendingUp, AlertTriangle, Bed, Pill } from 'lucide-react';
import { EmergencyScenario, SimulationResult } from '../types';
import { api } from '../services/api';

interface Props {
  onNavigateTab?: (tab: any) => void;
}

export const EmergencySimulatorView: React.FC<Props> = ({ onNavigateTab }) => {
  const [scenarios, setScenarios] = useState<EmergencyScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('SCN_MONSOON');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await api.getScenarios();
      setScenarios(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRun = async (scenId: string) => {
    setSelectedScenarioId(scenId);
    setIsSimulating(true);
    try {
      const res = await api.runSimulation(scenId);
      setTimeout(() => {
        setResult(res);
        setIsSimulating(false);
      }, 400);
    } catch (e) {
      console.error(e);
      setIsSimulating(false);
    }
  };

  const scenarioPills = [
    { id: 'SCN_NORMAL', label: 'Normal Baseline' },
    { id: 'SCN_MONSOON', label: 'Heavy Monsoon' },
    { id: 'SCN_FLOOD', label: 'Flood Surge' },
    { id: 'SCN_OUTBREAK', label: 'Disease Outbreak' },
    { id: 'SCN_SURGE', label: 'Patient Surge' },
    { id: 'SCN_DISRUPT', label: 'Supply Disruption' },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Top Header */}
      <section className="pt-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
          Emergency Simulator
        </h1>
        <p className="text-lg text-black/60 mt-1 font-medium">
          What happens if conditions change?
        </p>
      </section>

      {/* Scenario Selection Buttons */}
      <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {scenarioPills.map((scen) => {
          const isSelected = selectedScenarioId === scen.id;
          return (
            <motion.button
              key={scen.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleRun(scen.id)}
              className={`px-5 py-3 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                isSelected
                  ? 'bg-[#1D1D1F] text-white shadow-md'
                  : 'bg-white text-black/70 hover:text-black border border-black/5 hover:bg-[#F5F5F7]'
              }`}
            >
              {scen.label}
            </motion.button>
          );
        })}
      </section>

      {/* Animated Impact Metrics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Demand</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#FF3B30] tracking-tight mt-1 flex items-center gap-1">
            <span>↑ 28%</span>
          </div>
          <span className="text-xs text-black/50 mt-1 block">OPD patient volume surge</span>
        </motion.div>

        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Medicine consumption</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#FF9500] tracking-tight mt-1 flex items-center gap-1">
            <span>↑ 34%</span>
          </div>
          <span className="text-xs text-black/50 mt-1 block">Rapid burn rate on ORS & antibiotics</span>
        </motion.div>

        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Stock-out risk</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#FF3B30] tracking-tight mt-1 flex items-center gap-1">
            <span>↑ 17%</span>
          </div>
          <span className="text-xs text-black/50 mt-1 block">Facilities breaching safety buffer</span>
        </motion.div>

        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Bed pressure</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#007AFF] tracking-tight mt-1 flex items-center gap-1">
            <span>↑ 12%</span>
          </div>
          <span className="text-xs text-black/50 mt-1 block">Acute in-patient admissions</span>
        </motion.div>
      </section>

      {/* BEFORE vs AFTER Differential Comparison Cards */}
      {result && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-black/5">
            <div>
              <span className="text-xs font-semibold uppercase text-black/40">
                Stress Simulation Telemetry
              </span>
              <h3 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
                Before vs After Network Impact
              </h3>
            </div>
            <span className="text-xs text-black/40 font-mono">
              Timestamp: {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Card */}
            <div className="p-6 bg-[#F8F8FA] rounded-2xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-black/40">
                Baseline (Before Shock)
              </span>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Facilities at Risk:</span>
                  <span className="font-bold text-[#1D1D1F] font-mono">{result.before.phcs_at_risk}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Critical Deficits:</span>
                  <span className="font-bold text-[#1D1D1F] font-mono">{result.before.critical_risks}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Available Beds:</span>
                  <span className="font-bold text-[#007AFF] font-mono">{result.before.beds_available}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Recommended Transfers:</span>
                  <span className="font-bold text-[#34C759] font-mono">{result.before.recommended_transfers}</span>
                </div>
              </div>
            </div>

            {/* After Card */}
            <div className="p-6 bg-white border border-[#FF3B30]/20 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF3B30]">
                  Dynamic Response (After Shock)
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFEAEA] text-[#FF3B30] font-mono">
                  +{result.deltas.recommended_transfers_delta} Rebalances
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Facilities at Risk:</span>
                  <span className="font-bold text-[#FF3B30] font-mono">{result.after.phcs_at_risk}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Critical Deficits:</span>
                  <span className="font-bold text-[#FF3B30] font-mono">{result.after.critical_risks}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Available Beds:</span>
                  <span className="font-bold text-[#007AFF] font-mono">{result.after.beds_available}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Recommended Transfers:</span>
                  <span className="font-bold text-[#34C759] font-mono">{result.after.recommended_transfers}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
