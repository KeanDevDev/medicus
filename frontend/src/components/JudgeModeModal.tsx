import React from 'react';
import { 
  X, CheckCircle2, ShieldCheck, Zap, RotateCcw, 
  HelpCircle, ArrowRight, Sparkles 
} from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  onNavigateTab: (tab: any) => void;
}

export const JudgeModeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onRefreshData,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const handleSeed = async (scenId: string) => {
    try {
      await api.seedDemo(scenId);
      onRefreshData();
      onClose();
      onNavigateTab('emergency');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetDemo();
      onRefreshData();
      onClose();
      onNavigateTab('national');
    } catch (e) {
      console.error(e);
    }
  };

  const steps = [
    {
      title: '1. National Operations Map & Telemetry',
      tab: 'national',
      desc: 'Inspect live reporting across 5 pilot states (MH, KA, RJ, TN, UP) with 208 facilities, live stream feed, and capacity rings.',
    },
    {
      title: '2. Primary Health Centre (PHC) Operations',
      tab: 'phc',
      desc: 'Actionable facility view with outpatient footfalls, bed occupancy, doctor attendance, and searchable medicine inventory table.',
    },
    {
      title: '3. Explainable Stock-out Risk Matrix (2D Scatter)',
      tab: 'risks',
      desc: 'Interactive 2D matrix (Days of Stock vs Risk Probability) with upper-left critical zone and root-cause explainability.',
    },
    {
      title: '4. Autonomous Logistics Redistribution',
      tab: 'redistribution',
      desc: 'Deterministic linear solver routes emergency stocks with interactive Approve/Reject actions and SIMULATED OPERATIONAL ACTION logging.',
    },
    {
      title: '5. Emergency Scenario Stress Simulator',
      tab: 'emergency',
      desc: 'Simulate climate and outbreak shocks with dynamic Before vs After comparisons.',
    },
    {
      title: '6. MEDICUS Assist Grounded AI Copilot',
      tab: 'copilot',
      desc: 'Query grounded telemetry with Gemini 3.8 Flash, featuring expandable rationale and verifiable citations.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
      <div className="bg-white/95 backdrop-blur-2xl border border-black/8 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl text-xs text-[#1D1D1F]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FF9500]/15 flex items-center justify-center text-[#FF9500]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1D1D1F]">Evaluation Guided Tour</h3>
              <p className="text-black/50 text-xs">A structured walk-through of the core technical workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-black/40 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Triggers */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSeed('SCN_MONSOON')}
            className="p-4 rounded-2xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0062CC] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Simulate Monsoon Surge</span>
          </button>
          <button
            onClick={handleReset}
            className="p-4 rounded-2xl bg-[#F5F5F7] text-[#1D1D1F] font-bold text-xs hover:bg-[#EAEAEA] border border-black/5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Baseline</span>
          </button>
        </div>

        {/* Inspection Steps */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-black/40">
            Guided Inspection Sequence
          </div>
          {steps.map((st, i) => (
            <div
              key={i}
              onClick={() => {
                onNavigateTab(st.tab);
                onClose();
              }}
              className="p-3.5 rounded-2xl bg-[#F8F8FA] hover:bg-[#F2F2F5] transition-all cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div>
                <div className="font-bold text-sm text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                  {st.title}
                </div>
                <div className="text-black/50 text-[11px] mt-0.5">{st.desc}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-black/30 group-hover:text-[#007AFF] group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
