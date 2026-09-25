import React from 'react';
import { AlertCircle, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';
import { Severity } from '../types';

interface Props {
  severity: Severity;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<Props> = ({ severity, size = 'md' }) => {
  const isSm = size === 'sm';
  const baseClasses = `inline-flex items-center gap-1.5 font-semibold rounded-md uppercase tracking-wider ${
    isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
  }`;

  switch (severity) {
    case 'CRITICAL':
      return (
        <span className={`${baseClasses} bg-red-950/80 text-red-400 border border-red-800/80 shadow-xs shadow-red-950`}>
          <AlertCircle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>CRITICAL</span>
        </span>
      );
    case 'HIGH':
      return (
        <span className={`${baseClasses} bg-amber-950/80 text-amber-400 border border-amber-800/80`}>
          <AlertTriangle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>HIGH</span>
        </span>
      );
    case 'WATCH':
      return (
        <span className={`${baseClasses} bg-yellow-950/80 text-yellow-400 border border-yellow-800/80`}>
          <Eye className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>WATCH</span>
        </span>
      );
    case 'NORMAL':
    default:
      return (
        <span className={`${baseClasses} bg-emerald-950/80 text-emerald-400 border border-emerald-800/80`}>
          <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>NORMAL</span>
        </span>
      );
  }
};
