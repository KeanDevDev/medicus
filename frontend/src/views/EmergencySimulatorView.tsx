import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, RotateCcw, ArrowRight, Zap, TrendingUp, AlertTriangle, 
  Bed, Pill, Sliders, Plus, X, Check, Thermometer, CloudRain, 
  ShieldAlert, Sparkles, Activity, RefreshCw, Layers, Wind, Flame
} from 'lucide-react';
import { EmergencyScenario, SimulationResult, DistrictRecord } from '../types';
import { api } from '../services/api';
import { realtime } from '../services/realtime';

interface Props {
  onNavigateTab?: (tab: any) => void;
}

export const EmergencySimulatorView: React.FC<Props> = ({ onNavigateTab }) => {
  const [scenarios, setScenarios] = useState<EmergencyScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('SCN_MONSOON');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom Emergency Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('Severe Flash Flood & Leptospirosis Outbreak');
  const [customDesc, setCustomDesc] = useState('Sudden inundation causing supply chain road blockages and 2.5x surge in antimicrobial and hydration demand.');
  const [demandFactor, setDemandFactor] = useState<number>(2.4);
  const [diseaseFactor, setDiseaseFactor] = useState<number>(3.0);
  const [leadTimeMult, setLeadTimeMult] = useState<number>(2.5);
  const [tempSurge, setTempSurge] = useState<number>(2.0);
  const [rainSurge, setRainSurge] = useState<number>(95.0);
  const [scopeType, setScopeType] = useState<'all' | 'custom'>('all');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(['MH_PUN', 'KA_BLR', 'KL_EKM']);
  const [allDistricts, setAllDistricts] = useState<DistrictRecord[]>([]);

  useEffect(() => {
    loadScenarios();
    loadDistricts();

    // Listen to real-time events across network & tabs
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type === 'SIMULATION_COMPLETED' || event.type === 'SIMULATION_RESET') {
        loadScenarios();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await api.getScenarios();
      setScenarios(data);
    } catch (e) {
      console.error('Failed to load emergency scenarios:', e);
    }
  };

  const loadDistricts = async () => {
    try {
      const dists = await api.getDistricts();
      setAllDistricts(dists);
    } catch (e) {
      console.error('Failed to load districts:', e);
    }
  };

  const handleRun = async (scenId: string) => {
    setSelectedScenarioId(scenId);
    setIsSimulating(true);
    setErrorMessage(null);
    try {
      const res = await api.runSimulation(scenId);
      setTimeout(() => {
        setResult(res);
        setIsSimulating(false);
      }, 350);
    } catch (e: any) {
      console.error('Simulation execution error:', e);
      setErrorMessage(e?.message || 'Emergency simulation execution failed');
      setIsSimulating(false);
    }
  };

  const handleResetBaseline = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await api.resetSimulation();
      setSelectedScenarioId('SCN_NORMAL');
      const baselineRes = await api.runSimulation('SCN_NORMAL');
      setResult(baselineRes);
      await loadScenarios();
    } catch (e: any) {
      console.error('Reset failed:', e);
      setErrorMessage('Failed to reset simulation baseline');
    } finally {
      setIsResetting(false);
    }
  };

  const handleRunCustomSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setErrorMessage(null);
    try {
      const customParams = {
        name: customName.trim(),
        description: customDesc.trim(),
        demand_factor: Number(demandFactor),
        disease_factor: Number(diseaseFactor),
        lead_time_multiplier: Number(leadTimeMult),
        temperature_surge: Number(tempSurge),
        rainfall_surge: Number(rainSurge),
        affected_districts: scopeType === 'all' ? [] : selectedDistricts,
      };

      const res = await api.runCustomSimulation(customParams);
      await loadScenarios();
      setSelectedScenarioId(res.scenario_id);
      setResult(res);
      setIsCustomModalOpen(false);
    } catch (err: any) {
      console.error('Custom simulation error:', err);
      setErrorMessage(err?.message || 'Failed to execute custom simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  const toggleDistrictSelection = (distId: string) => {
    setSelectedDistricts(prev => 
      prev.includes(distId) ? prev.filter(d => d !== distId) : [...prev, distId]
    );
  };

  // Helper to pick scenario icons & styles
  const getScenarioBadge = (id: string, name: string) => {
    if (id === 'SCN_NORMAL') {
      return { icon: <Activity className="w-3.5 h-3.5 text-gray-500" />, label: 'Baseline', color: 'border-gray-200' };
    }
    if (id === 'SCN_HEATWAVE') {
      return { icon: <Flame className="w-3.5 h-3.5 text-amber-500" />, label: 'Heat Crisis', color: 'border-amber-400' };
    }
    if (id === 'SCN_CYCLONE') {
      return { icon: <Wind className="w-3.5 h-3.5 text-cyan-500" />, label: 'Cyclone', color: 'border-cyan-400' };
    }
    if (id === 'SCN_MONSOON' || id === 'SCN_FLOOD') {
      return { icon: <CloudRain className="w-3.5 h-3.5 text-blue-500" />, label: 'Flood / Rain', color: 'border-blue-400' };
    }
    if (id === 'SCN_OUTBREAK') {
      return { icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />, label: 'Epidemic', color: 'border-rose-400' };
    }
    if (id.startsWith('SCN_CUSTOM')) {
      return { icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" />, label: 'Custom', color: 'border-purple-400' };
    }
    return { icon: <Zap className="w-3.5 h-3.5 text-indigo-500" />, label: 'Crisis Shock', color: 'border-indigo-400' };
  };

  // Active scenario details
  const activeScenario = scenarios.find(s => s.scenario_id === selectedScenarioId);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <section className="pt-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-100 text-rose-700 border border-rose-200">
              Stress-Testing Engine
            </span>
            <span className="text-xs text-gray-500">Real-time Network Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight mt-1">
            Emergency Simulator
          </h1>
          <p className="text-base sm:text-lg text-black/60 mt-1 font-medium">
            Simulate climate shocks, disease outbreaks, and logistics disruptions across 208 primary health centres in real-time.
          </p>
        </div>

        {/* Global Simulation Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0066CC] text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Custom Emergency Simulation</span>
          </button>

          <button
            onClick={handleResetBaseline}
            disabled={isResetting || isSimulating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-gray-100 text-gray-800 border border-black/10 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Reset simulation parameters to operational baseline"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting...' : 'Reset Baseline'}</span>
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dynamic Scenario Selection Rail */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
          <span>Available Crisis Scenarios ({scenarios.length})</span>
          {isSimulating && (
            <span className="text-[#007AFF] flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Computing stress vectors...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {scenarios.map((scen) => {
            const isSelected = selectedScenarioId === scen.scenario_id;
            const badge = getScenarioBadge(scen.scenario_id, scen.name);
            return (
              <motion.button
                key={scen.scenario_id}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleRun(scen.scenario_id)}
                disabled={isSimulating}
                className={`group px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-md ring-2 ring-black/10'
                    : 'bg-white text-black/75 hover:text-black border-black/8 hover:bg-[#F5F5F7] shadow-xs'
                }`}
              >
                <span className={isSelected ? 'text-white' : ''}>
                  {badge.icon}
                </span>
                <span>{scen.name}</span>
                {scen.scenario_id.startsWith('SCN_CUSTOM') && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-extrabold ${
                    isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                  }`}>
                    Custom
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Active Scenario Overview Banner */}
      {activeScenario && (
        <section className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-black/5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-mono font-bold uppercase">
                {activeScenario.scenario_id}
              </span>
              <h2 className="text-xl font-bold text-[#1D1D1F]">
                {activeScenario.name}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 max-w-3xl">
              {activeScenario.description}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => handleRun(selectedScenarioId)}
              disabled={isSimulating}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isSimulating ? 'animate-pulse' : ''}`} />
              <span>{isSimulating ? 'Recomputing Shock...' : 'Re-Run Simulation'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Dynamic Impact Metrics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: At-Risk PHCs */}
        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Facilities Breaching Safety</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#FF3B30] tracking-tight mt-1 flex items-center gap-1.5">
            <span>
              {result?.after?.phcs_at_risk ?? 28}
            </span>
            {result?.deltas?.phcs_at_risk_delta !== undefined && result.deltas.phcs_at_risk_delta !== 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                {result.deltas.phcs_at_risk_delta > 0 ? `+${result.deltas.phcs_at_risk_delta}` : result.deltas.phcs_at_risk_delta}
              </span>
            )}
          </div>
          <span className="text-xs text-black/50 mt-1 block">PHCs entering emergency danger threshold</span>
        </motion.div>

        {/* Metric 2: Critical Stockouts */}
        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Critical Medicine Deficits</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#FF9500] tracking-tight mt-1 flex items-center gap-1.5">
            <span>
              {result?.after?.critical_risks ?? 14}
            </span>
            {result?.deltas?.critical_risks_delta !== undefined && result.deltas.critical_risks_delta !== 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {result.deltas.critical_risks_delta > 0 ? `+${result.deltas.critical_risks_delta}` : result.deltas.critical_risks_delta}
              </span>
            )}
          </div>
          <span className="text-xs text-black/50 mt-1 block">Essential drugs depleting in &lt; 3 days</span>
        </motion.div>

        {/* Metric 3: Bed Pressure */}
        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Available Beds Left</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#007AFF] tracking-tight mt-1 flex items-center gap-1.5">
            <span>
              {result?.after?.beds_available ?? 1840}
            </span>
            {result?.deltas?.beds_available_delta !== undefined && result.deltas.beds_available_delta !== 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {result.deltas.beds_available_delta > 0 ? `+${result.deltas.beds_available_delta}` : result.deltas.beds_available_delta}
              </span>
            )}
          </div>
          <span className="text-xs text-black/50 mt-1 block">In-patient triage headroom across grid</span>
        </motion.div>

        {/* Metric 4: Rebalances Needed */}
        <motion.div
          animate={{ scale: isSimulating ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/4"
        >
          <span className="text-xs font-semibold uppercase text-black/40">Recommended Transfers</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#34C759] tracking-tight mt-1 flex items-center gap-1.5">
            <span>
              {result?.after?.recommended_transfers ?? 42}
            </span>
            {result?.deltas?.recommended_transfers_delta !== undefined && result.deltas.recommended_transfers_delta !== 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {result.deltas.recommended_transfers_delta > 0 ? `+${result.deltas.recommended_transfers_delta}` : result.deltas.recommended_transfers_delta}
              </span>
            )}
          </div>
          <span className="text-xs text-black/50 mt-1 block">Lateral supply transfers calculated</span>
        </motion.div>
      </section>

      {/* BEFORE vs AFTER Differential Comparison Cards */}
      {result && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/5 gap-2">
            <div>
              <span className="text-xs font-semibold uppercase text-black/40">
                Stress Telemetry Comparison
              </span>
              <h3 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
                Before vs After Network Shock
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-black/40 font-mono">
                Executed: {new Date(result.timestamp).toLocaleTimeString()}
              </span>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('redistribution')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition cursor-pointer"
                >
                  <span>View Redistribution Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Affected Districts Tags if present */}
          {result.affected_districts && result.affected_districts.length > 0 && (
            <div className="p-3.5 bg-gray-50 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
                Impact Epicenters:
              </span>
              {result.affected_districts.map((d: string) => (
                <span key={d} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-mono font-medium">
                  {d}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Card */}
            <div className="p-6 bg-[#F8F8FA] rounded-2xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-black/40">
                Baseline Operational Status (Pre-Shock)
              </span>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Facilities at Risk:</span>
                  <span className="font-bold text-[#1D1D1F] font-mono">{result.before?.phcs_at_risk ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Critical Stockout Deficits:</span>
                  <span className="font-bold text-[#1D1D1F] font-mono">{result.before?.critical_risks ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Available Beds:</span>
                  <span className="font-bold text-[#007AFF] font-mono">{result.before?.beds_available ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Recommended Transfers:</span>
                  <span className="font-bold text-[#34C759] font-mono">{result.before?.recommended_transfers ?? 0}</span>
                </div>
              </div>
            </div>

            {/* After Card */}
            <div className="p-6 bg-white border border-[#FF3B30]/20 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF3B30]">
                  Dynamic Emergency Response (Post-Shock)
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFEAEA] text-[#FF3B30] font-mono">
                  {result.deltas?.recommended_transfers_delta !== undefined
                    ? `+${result.deltas.recommended_transfers_delta} Rebalances Required`
                    : 'Emergency Rebalances'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Facilities at Risk:</span>
                  <span className="font-bold text-[#FF3B30] font-mono">{result.after?.phcs_at_risk ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Critical Stockout Deficits:</span>
                  <span className="font-bold text-[#FF3B30] font-mono">{result.after?.critical_risks ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Available Beds:</span>
                  <span className="font-bold text-[#007AFF] font-mono">{result.after?.beds_available ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black/60">Recommended Transfers:</span>
                  <span className="font-bold text-[#34C759] font-mono">{result.after?.recommended_transfers ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Custom Emergency Simulation Modal */}
      <AnimatePresence>
        {isCustomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-black/10 my-8 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1D1D1F]">
                      Create Custom Emergency Simulation
                    </h3>
                    <p className="text-xs text-gray-500">
                      Simulate multi-factor clinical surges and logistics bottlenecks in real-time
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCustomModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRunCustomSimulation} className="space-y-5">
                {/* Scenario Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Crisis Scenario Title
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Viral Encephalitis Surge & Monsoon Floods"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                {/* Scenario Rationale */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Clinical Rationale & Context
                  </label>
                  <textarea
                    rows={2}
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="Describe the clinical trigger, weather factors, and expected bottlenecks..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
                  />
                </div>

                {/* Sliders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  {/* Slider 1: Demand Factor */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">Patient Demand Multiplier</span>
                      <span className="font-mono font-bold text-rose-600">{demandFactor.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.1"
                      value={demandFactor}
                      onChange={(e) => setDemandFactor(parseFloat(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-500 block">Surge in OPD & emergency patient intake</span>
                  </div>

                  {/* Slider 2: Disease Morbidity Factor */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">Disease Morbidity Index</span>
                      <span className="font-mono font-bold text-amber-600">{diseaseFactor.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={diseaseFactor}
                      onChange={(e) => setDiseaseFactor(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-500 block">Depletion velocity for antibiotics & fluids</span>
                  </div>

                  {/* Slider 3: Lead Time Multiplier */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">Supply Transport Delay</span>
                      <span className="font-mono font-bold text-blue-600">{leadTimeMult.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={leadTimeMult}
                      onChange={(e) => setLeadTimeMult(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-500 block">Road blockages and transit lead time multiplier</span>
                  </div>

                  {/* Slider 4: Temperature Surge */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">Temperature Surge</span>
                      <span className="font-mono font-bold text-orange-600">+{tempSurge.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="12.0"
                      step="0.5"
                      value={tempSurge}
                      onChange={(e) => setTempSurge(parseFloat(e.target.value))}
                      className="w-full accent-orange-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-500 block">Thermal stress and dehydration caseload</span>
                  </div>

                  {/* Slider 5: Rainfall Surge */}
                  <div className="sm:col-span-2 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">Rainfall Precipitation Surge</span>
                      <span className="font-mono font-bold text-cyan-600">+{rainSurge.toFixed(0)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="5"
                      value={rainSurge}
                      onChange={(e) => setRainSurge(parseFloat(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-500 block">Waterborne pathogen risks and logistical inundation</span>
                  </div>
                </div>

                {/* Scope Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Target Geographic Scope
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeType === 'all'}
                        onChange={() => setScopeType('all')}
                        className="accent-[#007AFF]"
                      />
                      <span>National Network (All 208 Facilities)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeType === 'custom'}
                        onChange={() => setScopeType('custom')}
                        className="accent-[#007AFF]"
                      />
                      <span>Select High-Risk Epicenters</span>
                    </label>
                  </div>

                  {scopeType === 'custom' && (
                    <div className="flex flex-wrap gap-1.5 pt-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                      {allDistricts.map((d) => {
                        const isSelected = selectedDistricts.includes(d.district_id);
                        return (
                          <button
                            key={d.district_id}
                            type="button"
                            onClick={() => toggleDistrictSelection(d.district_id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#007AFF] text-white'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {d.district_name} ({d.district_id})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCustomModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0066CC] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isSimulating ? 'Simulating...' : 'Launch Emergency Simulation'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
