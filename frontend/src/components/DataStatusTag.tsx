import React from 'react';
import { Database, Cpu, Sparkles } from 'lucide-react';
import { DataStatus } from '../types';

interface Props {
  status: DataStatus;
}

export const DataStatusTag: React.FC<Props> = ({ status }) => {
  switch (status) {
    case 'REAL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-sm bg-blue-950 text-blue-300 border border-blue-800" title="Verified Government of India Public Data">
          <Database className="w-2.5 h-2.5 text-blue-400" />
          <span>REAL GOV DATA</span>
        </span>
      );
    case 'SIMULATED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-sm bg-slate-800 text-slate-300 border border-slate-700" title="Statistically Calibrated Synthetic Simulation">
          <Cpu className="w-2.5 h-2.5 text-slate-400" />
          <span>SIMULATED CALIBRATED</span>
        </span>
      );
    case 'DERIVED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-sm bg-purple-950 text-purple-300 border border-purple-800" title="Machine Learning Predictive Model Output">
          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
          <span>DERIVED ML</span>
        </span>
      );
  }
};
