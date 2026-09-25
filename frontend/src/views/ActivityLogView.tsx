import React, { useState, useEffect } from 'react';
import { History, Truck, AlertTriangle, Network, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ActivityEvent } from '../types';
import { api } from '../services/api';

export const ActivityLogView: React.FC = () => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await api.getActivity(40);
      setActivities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filtered = filterType === 'ALL' 
    ? activities 
    : activities.filter((a) => a.event_type === filterType || (filterType === 'TRANSFER' && a.event_type.includes('TRANSFER')));

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            Audit Trail & Activity Log
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Tamper-Evident Sequence • AI Rebalancing Approvals • Federated Learning Telemetry
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-black/5 shadow-xs text-xs font-semibold">
            {['ALL', 'TRANSFER', 'RISK_ALERT', 'FEDERATED'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  filterType === t
                    ? 'bg-[#1D1D1F] text-white shadow-xs'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                {t === 'ALL' ? 'All Activity' : t === 'TRANSFER' ? 'Transfers' : t === 'RISK_ALERT' ? 'Risks' : 'Federated'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchActivities}
            className="p-2 rounded-full bg-white hover:bg-black/5 text-black/60 border border-black/8 shadow-xs transition-colors cursor-pointer"
            title="Refresh activity log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {loading ? (
        <div className="p-16 text-center text-black/40 text-xs">
          Loading audit events...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-black/50 border border-black/4 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-[#34C759] mx-auto mb-2" />
          <h4 className="font-bold text-[#1D1D1F] text-base">No Audit Events</h4>
          <p className="text-xs text-black/40 mt-1">No activities logged under this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-black/4 shadow-sm overflow-hidden divide-y divide-black/4">
          {filtered.map((item, idx) => {
            const isTransfer = item.event_type.includes('TRANSFER');
            const isRisk = item.event_type === 'RISK_ALERT';
            const isFed = item.event_type === 'FEDERATED';

            return (
              <div key={idx} className="p-5 hover:bg-[#F9F9FB] transition-colors flex items-start gap-4">
                <div className={`p-2.5 rounded-2xl flex-shrink-0 mt-0.5 ${
                  isTransfer 
                    ? 'bg-[#007AFF]/10 text-[#007AFF]' 
                    : isRisk 
                    ? 'bg-[#FFEAEA] text-[#FF3B30]' 
                    : 'bg-[#EAF8EE] text-[#34C759]'
                }`}>
                  {isTransfer && <Truck className="w-4 h-4" />}
                  {isRisk && <AlertTriangle className="w-4 h-4" />}
                  {isFed && <Network className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        isRisk 
                          ? 'bg-[#FFEAEA] text-[#FF3B30]' 
                          : isTransfer 
                          ? 'bg-[#007AFF]/10 text-[#007AFF]' 
                          : 'bg-[#EAF8EE] text-[#34C759]'
                      }`}>
                        {item.event_type}
                      </span>
                      <span className="font-mono text-[11px] text-black/40">
                        {item.entity_id}
                      </span>
                    </div>
                    <span className="text-[11px] text-black/40 font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#1D1D1F] mt-1.5 font-medium leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
