import React from 'react';
import { MapPin, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';

interface StateMapData {
  state_id: string;
  state_name: string;
  districts_count: number;
  phcs_count: number;
  critical_risks: number;
  status: 'OPTIMAL' | 'WATCH' | 'CRITICAL';
  x: number; // percentage coordinate on SVG
  y: number;
}

interface Props {
  onSelectState: (stateId: string) => void;
  selectedStateId?: string;
}

export const InteractiveMap: React.FC<Props> = ({ onSelectState, selectedStateId }) => {
  const states: StateMapData[] = [
    {
      state_id: 'RJ',
      state_name: 'Rajasthan',
      districts_count: 5,
      phcs_count: 40,
      critical_risks: 2,
      status: 'WATCH',
      x: 32,
      y: 35,
    },
    {
      state_id: 'UP',
      state_name: 'Uttar Pradesh',
      districts_count: 6,
      phcs_count: 48,
      critical_risks: 4,
      status: 'CRITICAL',
      x: 48,
      y: 34,
    },
    {
      state_id: 'MH',
      state_name: 'Maharashtra',
      districts_count: 6,
      phcs_count: 48,
      critical_risks: 3,
      status: 'CRITICAL',
      x: 36,
      y: 56,
    },
    {
      state_id: 'KA',
      state_name: 'Karnataka',
      districts_count: 5,
      phcs_count: 40,
      critical_risks: 1,
      status: 'OPTIMAL',
      x: 38,
      y: 72,
    },
    {
      state_id: 'TN',
      state_name: 'Tamil Nadu',
      districts_count: 4,
      phcs_count: 32,
      critical_risks: 1,
      status: 'OPTIMAL',
      x: 44,
      y: 84,
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="font-bold text-sm text-white">Federated State Operations Radar</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            5 State Nodes reporting real-time inventory telemetry to central control tower
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Optimal (&lt;2 risks)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Action Required (&ge;3 risks)</span>
          </div>
        </div>
      </div>

      {/* Grid of state operational cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {states.map((st) => {
          const isSelected = selectedStateId === st.state_id;
          return (
            <div
              key={st.state_id}
              onClick={() => onSelectState(st.state_id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-emerald-950/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">{st.state_id}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    st.status === 'CRITICAL'
                      ? 'bg-rose-500 animate-pulse'
                      : st.status === 'WATCH'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <h4 className="font-bold text-slate-100 text-sm mt-1 truncate">{st.state_name}</h4>

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Districts:</span>
                  <span className="font-semibold text-slate-200 font-mono">{st.districts_count}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PHCs:</span>
                  <span className="font-semibold text-slate-200 font-mono">{st.phcs_count}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Critical Risks:</span>
                  <span
                    className={`font-bold font-mono ${
                      st.critical_risks > 2 ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {st.critical_risks}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-emerald-400 font-semibold group">
                <span>View State</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
