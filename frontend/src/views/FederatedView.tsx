import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, ShieldCheck, Play, ArrowDown, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { FederatedRound } from '../types';
import { api } from '../services/api';

export const FederatedView: React.FC = () => {
  const [rounds, setRounds] = useState<FederatedRound[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getFederatedStatus();
      setRounds(data.rounds || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTrain = async () => {
    setIsTraining(true);
    try {
      await api.triggerFederatedRounds(3);
      await loadStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Top Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            Federated Intelligence
          </h1>
          <p className="text-lg text-black/60 mt-1 font-medium">
            Learn together. Keep data local.
          </p>
        </div>

        <button
          onClick={handleTrain}
          disabled={isTraining}
          className="px-5 py-2.5 rounded-full bg-[#34C759] hover:bg-[#2DB34E] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isTraining ? 'animate-spin' : ''}`} />
          <span>{isTraining ? 'Aggregating Edges...' : 'Trigger Decentralized FedAvg'}</span>
        </button>
      </section>

      {/* Central Visual Hub: Global Model surrounded by 3 State Edge Nodes */}
      <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-black/4 relative overflow-hidden">
        <div className="text-center max-w-md mx-auto mb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Privacy Preserving Topology
          </div>
          <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            State-Local Gradient Aggregation
          </h3>
          <p className="text-xs text-black/50 mt-1">
            Raw patient and inventory rows never leave state servers. Only weight matrices are exchanged.
          </p>
        </div>

        {/* Node Topology Canvas */}
        <div className="relative h-80 flex items-center justify-center">
          {/* Central Hub: GLOBAL MODEL */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-36 h-36 rounded-full bg-[#1D1D1F] text-white flex flex-col items-center justify-center z-20 shadow-xl border-4 border-white"
          >
            <Cpu className="w-8 h-8 text-[#34C759] mb-1" />
            <span className="text-xs font-black tracking-wider uppercase">Global Model</span>
            <span className="text-[10px] text-white/60 font-mono mt-0.5">FedAvg v3.0</span>
          </motion.div>

          {/* Left Edge Node: Maharashtra */}
          <div className="absolute left-8 sm:left-16 top-1/2 -translate-y-1/2 flex flex-col items-center z-10">
            <div className="w-24 h-24 rounded-full bg-[#F5F5F7] border border-black/6 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-[#1D1D1F]">Maharashtra</span>
              <span className="text-[10px] text-[#34C759] font-mono font-semibold">48 PHCs</span>
            </div>
            <span className="text-[10px] text-black/40 mt-1 font-mono">Edge Node MH</span>
          </div>

          {/* Top Right Edge Node: Karnataka */}
          <div className="absolute right-12 sm:right-24 top-6 flex flex-col items-center z-10">
            <div className="w-24 h-24 rounded-full bg-[#F5F5F7] border border-black/6 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-[#1D1D1F]">Karnataka</span>
              <span className="text-[10px] text-[#007AFF] font-mono font-semibold">40 PHCs</span>
            </div>
            <span className="text-[10px] text-black/40 mt-1 font-mono">Edge Node KA</span>
          </div>

          {/* Bottom Right Edge Node: Rajasthan */}
          <div className="absolute right-12 sm:right-24 bottom-6 flex flex-col items-center z-10">
            <div className="w-24 h-24 rounded-full bg-[#F5F5F7] border border-black/6 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-[#1D1D1F]">Rajasthan</span>
              <span className="text-[10px] text-[#FF9500] font-mono font-semibold">40 PHCs</span>
            </div>
            <span className="text-[10px] text-black/40 mt-1 font-mono">Edge Node RJ</span>
          </div>

          {/* SVG Animated Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="#E5E5EA" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="80%" y1="20%" x2="50%" y2="50%" stroke="#E5E5EA" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="80%" y1="80%" x2="50%" y2="50%" stroke="#E5E5EA" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* 4-Step Pipeline Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-black/5 text-center text-xs">
          <div className="p-3 bg-[#F8F8FA] rounded-2xl">
            <div className="text-[10px] font-bold uppercase text-black/40">Step 1</div>
            <div className="font-bold text-[#1D1D1F] mt-0.5">Local training</div>
          </div>
          <div className="p-3 bg-[#F8F8FA] rounded-2xl">
            <div className="text-[10px] font-bold uppercase text-black/40">Step 2</div>
            <div className="font-bold text-[#1D1D1F] mt-0.5">Model update</div>
          </div>
          <div className="p-3 bg-[#F8F8FA] rounded-2xl">
            <div className="text-[10px] font-bold uppercase text-black/40">Step 3</div>
            <div className="font-bold text-[#1D1D1F] mt-0.5">Federated aggregation</div>
          </div>
          <div className="p-3 bg-[#F8F8FA] rounded-2xl">
            <div className="text-[10px] font-bold uppercase text-black/40">Step 4</div>
            <div className="font-bold text-[#1D1D1F] mt-0.5">Global model</div>
          </div>
        </div>
      </section>

      {/* Training Convergence Rounds List */}
      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Convergence History
          </div>
          <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            Synchronized Rounds
          </h3>
        </div>

        <div className="space-y-2.5">
          {rounds.map((rd) => (
            <div
              key={rd.round_id}
              className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-black/4 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold font-mono text-sm text-[#007AFF] bg-[#007AFF]/10 px-3 py-1 rounded-full">
                  Round {rd.round_number}
                </span>
                <div>
                  <div className="font-bold text-[#1D1D1F]">{rd.global_model_version}</div>
                  <div className="text-black/40 mt-0.5">{rd.participating_states} • {rd.total_samples} samples</div>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono">
                <div>
                  <span className="text-black/40 block text-[10px] uppercase">Global MAE</span>
                  <span className="font-bold text-[#34C759]">{rd.global_mae.toFixed(2)} units</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-black/40 block text-[10px] uppercase">Post-loss</span>
                  <span className="font-bold text-[#1D1D1F]">{rd.post_aggregation_loss.toFixed(4)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
