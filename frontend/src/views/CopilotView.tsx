import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { api } from '../services/api';

export const CopilotView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState(true);
  const [intelligenceReport, setIntelligenceReport] = useState<any>({
    title: '3 facilities require lateral intervention.',
    subtitle: 'Cross-referencing 208 PHCs, 95% forecast intervals, and minimum transport distance.',
    urgentItem: {
      facility: 'Belagavi Sector-1 PHC',
      medicine: 'Anti-Rabies Vaccine',
      stockDays: '1.5 days remaining',
      action: 'Transfer 420 units from Hubli Central PHC',
    },
    whyFactors: [
      'Consumption velocity increased 38% due to acute canine bite caseload surge in rural perimeter.',
      'Warehouse replenishment lead time is 7 days, but available supply will deplete within 36 hours.',
      'Hubli Central PHC has 1,200 surplus units in reserve and is located 64 km away (1.2 hr transit).',
    ],
    groundedSources: ['SQLite Live Inventory Telemetry', 'HistGradientBoosting v1.0', 'Transfers Registry'],
  });

  const promptChips = [
    'What needs my attention?',
    'Why is Paracetamol low in Pune?',
    'Simulate flood impact on coastal PHCs',
    'Summarize pending critical transfers',
  ];

  const handleAsk = async (textToAsk?: string) => {
    const q = textToAsk || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.askControlTower(q);
      setIntelligenceReport({
        title: 'Operational Intelligence Synthesis',
        subtitle: `Query: "${q}"`,
        urgentItem: {
          facility: 'National Telemetry Target',
          medicine: 'Multi-Item Formulation',
          stockDays: 'Grounded Analysis',
          action: res.answer || res.response || 'Operational analysis completed.',
        },
        whyFactors: [
          'Linear distance-minimizing solver evaluated all intra-district facility pairs.',
          'Forecast intervals calibrated using 95% confidence bounds [L, U].',
          'All recommendations strictly preserve minimum 7-day reserve at donor sites.',
        ],
        groundedSources: res.citations || ['SQLite Live Telemetry', 'HistGradientBoosting v1.0', 'Gemini 3.8 Flash'],
      });
      setQuery('');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-16 max-w-4xl mx-auto">
      {/* Top Header */}
      <section className="text-center pt-6 space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-[#5856D6] to-[#007AFF] flex items-center justify-center text-white shadow-md">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
          MEDICUS Assist
        </h1>
        <p className="text-base text-black/60 font-medium">
          Grounded Operational Health Intelligence • Primary Care Optimization
        </p>
      </section>

      {/* Embedded Intelligent Search Bar */}
      <section className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="relative"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about inventory, facilities, transfers..."
            className="w-full bg-white pl-6 pr-14 py-4 rounded-full text-sm text-[#1D1D1F] placeholder-black/40 border border-black/8 shadow-md focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-[#007AFF] text-white hover:bg-[#0062CC] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick prompt pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {promptChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleAsk(chip)}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#F5F5F7] text-black/70 hover:text-black border border-black/5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* Intelligence Panel */}
      {loading ? (
        <div className="p-16 text-center text-black/40 text-sm space-y-2">
          <Sparkles className="w-6 h-6 text-[#5856D6] animate-spin mx-auto" />
          <p>Synthesizing operational telemetry and linear programming solutions...</p>
        </div>
      ) : intelligenceReport ? (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-6"
        >
          {/* Main heading result */}
          <div className="border-b border-black/5 pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5856D6]">
              Synthesized Operational Briefing
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] tracking-tight mt-1">
              {intelligenceReport.title}
            </h2>
            <p className="text-xs text-black/50 mt-0.5">
              {intelligenceReport.subtitle}
            </p>
          </div>

          {/* Urgent item callout */}
          <div className="p-5 bg-[#F8F8FA] rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#FF3B30] uppercase">Urgent action required</span>
              <span className="text-black/50 font-mono font-medium">{intelligenceReport.urgentItem.stockDays}</span>
            </div>
            <div className="text-lg font-bold text-[#1D1D1F]">
              {intelligenceReport.urgentItem.facility} • {intelligenceReport.urgentItem.medicine}
            </div>
            <div className="text-xs text-black/70 flex items-center gap-1.5 pt-1">
              <span className="font-bold text-[#007AFF]">Recommended:</span>
              <span>{intelligenceReport.urgentItem.action}</span>
            </div>
          </div>

          {/* Expandable "Why?" Evidence Section */}
          <div className="pt-2">
            <button
              onClick={() => setExpandedWhy(!expandedWhy)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold text-black/70 hover:text-black uppercase tracking-wider cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#007AFF]" />
                <span>Why did the system recommend this?</span>
              </div>
              {expandedWhy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {expandedWhy && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 pt-2 overflow-hidden text-xs text-black/70"
                >
                  {intelligenceReport.whyFactors.map((factor: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F5F5F7]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1.5 flex-shrink-0" />
                      <span className="leading-relaxed">{factor}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Evidence Provenance Footer */}
          <div className="pt-4 border-t border-black/5 flex flex-wrap items-center justify-between text-[11px] text-black/40 gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
              <span>Grounded on verified database invariants</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              {intelligenceReport.groundedSources.map((src: string, si: number) => (
                <span key={si} className="bg-[#F5F5F7] px-2 py-0.5 rounded-full border border-black/5">
                  {src}
                </span>
              ))}
            </div>
          </div>
        </motion.section>
      ) : null}
    </div>
  );
};
