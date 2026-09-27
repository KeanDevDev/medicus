import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowDown, Truck, ArrowRight, ShieldCheck, CheckCircle2, 
  Clock, Check, X, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { TransferRow } from '../types';
import { api } from '../services/api';

interface Props {
  onSelectPhc?: (phcId: string) => void;
  onOpenTransferDrawer?: (transfer: TransferRow) => void;
}

type StatusTabType = 'ACTIVE' | 'REQUESTED' | 'RECOMMENDED' | 'APPROVED' | 'ALL';

export const RecommendationsView: React.FC<Props> = ({
  onSelectPhc,
  onOpenTransferDrawer,
}) => {
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTabType>('ACTIVE');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Live polling interval for real-time updates
  useEffect(() => {
    loadTransfers(true);
    const interval = setInterval(() => {
      loadTransfers(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [priorityFilter, statusTab]);

  const loadTransfers = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const statusParam = statusTab === 'ALL' ? undefined : statusTab;
      const data = await api.getRecommendations(priorityFilter || undefined, statusParam);
      setTransfers(data);
    } catch (e) {
      console.error('Failed to load transfers:', e);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  const handleApprove = async (transferId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProcessingId(transferId);
    try {
      const res = await api.approveTransfer(transferId);
      setFeedbackNotice(`Transfer ${transferId} approved (Simulated Operational Action)`);
      // Update local state immediately
      setTransfers(prev => prev.map(t => t.transfer_id === transferId ? { ...t, status: 'APPROVED' } : t));
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      alert('Error approving transfer: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (transferId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProcessingId(transferId);
    try {
      await api.rejectTransfer(transferId);
      setFeedbackNotice(`Transfer ${transferId} rejected`);
      setTransfers(prev => prev.filter(t => t.transfer_id !== transferId));
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      alert('Error rejecting transfer: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const requestedCount = transfers.filter(t => t.status === 'REQUESTED').length;

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
              Live Logistics Dispatch
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight mt-1">
            Redistribution Logistics
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Lateral Rebalancing Optimization • Minimum Distance Routing • Real-Time PHC Requests
          </p>
        </div>

        {/* Tab & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tab Pills with mouse wheel horizontal scroll */}
          <div 
            onWheel={(e) => {
              if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
            }}
            className="flex items-center gap-1 bg-white p-1 rounded-full border border-black/5 shadow-xs text-xs font-semibold overflow-x-auto scrollbar-none"
          >
            {[
              { id: 'ACTIVE', label: 'All Active Pending' },
              { id: 'REQUESTED', label: 'PHC Requests', badge: requestedCount },
              { id: 'RECOMMENDED', label: 'AI Optimization' },
              { id: 'APPROVED', label: 'Approved / In-Transit' },
              { id: 'ALL', label: 'All History' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id as StatusTabType)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusTab === tab.id
                    ? 'bg-[#1D1D1F] text-white shadow-xs'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusTab === tab.id ? 'bg-[#FF3B30] text-white' : 'bg-[#FFEAEA] text-[#FF3B30]'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-black/8 rounded-full px-3 py-1.5 text-xs text-[#1D1D1F] font-semibold focus:outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
          </select>
        </div>
      </section>

      {/* Real-time Feedback Banner */}
      {feedbackNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#EAF8EE] border border-[#34C759]/30 rounded-2xl flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 font-bold text-[#1D1D1F]">
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
            <span>{feedbackNotice}</span>
            <span className="text-[10px] bg-[#34C759] text-white font-bold px-2 py-0.5 rounded-full uppercase">
              SIMULATED OPERATIONAL ACTION
            </span>
          </div>
          <button onClick={() => setFeedbackNotice(null)} className="text-black/40 hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Logistics Route Cards */}
      <section className="space-y-4">
        {loading ? (
          <div className="p-16 text-center text-black/40 text-xs">Computing optimal logistics routes...</div>
        ) : transfers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-black/50 border border-black/4 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-[#34C759] mx-auto mb-2" />
            <h4 className="font-bold text-[#1D1D1F] text-base">
              {statusTab === 'APPROVED' ? 'No Approved Transfers in Queue' : 'Network Balanced'}
            </h4>
            <p className="text-xs text-black/40 mt-1">
              {statusTab === 'APPROVED' ? 'Approve active recommendations to dispatch transfers.' : 'All facilities operating with sufficient inventory buffers.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {transfers.map((tr) => {
              const isApproved = tr.status === 'APPROVED' || tr.status === 'COMPLETED' || tr.status === 'IN_TRANSIT';
              const isRequested = tr.status === 'REQUESTED';

              return (
                <motion.div
                  key={tr.transfer_id}
                  whileHover={{ y: -3 }}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-black/4 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  {/* Top: Medicine info & Priority / Status pill */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#1D1D1F]">
                          {tr.generic_name}
                        </h3>
                        {isRequested && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#FFEAEA] text-[#FF3B30] border border-[#FF3B30]/30 animate-pulse">
                            PHC Request
                          </span>
                        )}
                        {!isRequested && !isApproved && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[#EAF8EE] text-[#34C759] border border-[#34C759]/30">
                            AI Plan
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-black/40 font-mono mt-0.5">
                        {tr.transfer_id} • {tr.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isApproved && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#EAF8EE] text-[#34C759] border border-[#34C759]/30">
                          {tr.status}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase font-mono ${
                          tr.priority === 'CRITICAL'
                            ? 'bg-[#FFEAEA] text-[#FF3B30]'
                            : 'bg-[#FFF5E5] text-[#FF9500]'
                        }`}
                      >
                        {tr.priority}
                      </span>
                    </div>
                  </div>

                  {/* Flow details with donor surplus and recipient deficit */}
                  <div className="p-4 bg-[#F8F8FA] rounded-2xl relative space-y-4">
                    {/* Origin */}
                    <div className="flex items-start gap-3">
                      <span className="w-3 h-3 rounded-full bg-[#34C759] mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase text-black/40">Donor Facility</span>
                        <div 
                          onClick={() => onSelectPhc && onSelectPhc(tr.source_phc)}
                          className="font-bold text-sm text-[#1D1D1F] hover:text-[#007AFF] cursor-pointer"
                        >
                          {tr.source_phc_name || tr.source_phc}
                        </div>
                        <div className="text-xs text-[#34C759] font-mono font-medium mt-0.5">
                          +{tr.source_surplus} units available surplus
                        </div>
                      </div>
                    </div>

                    {/* Flow line with volume */}
                    <div className="ml-1.5 border-l-2 border-dashed border-[#007AFF]/40 pl-6 py-1 flex items-center justify-between text-xs text-[#007AFF] font-bold font-mono">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 animate-bounce" />
                        <span>{tr.quantity} {tr.unit}</span>
                      </div>
                      <span className="text-black/40 font-normal">
                        {tr.estimated_transport_distance} km • {tr.estimated_lead_time || 2.5} hrs
                      </span>
                    </div>

                    {/* Destination */}
                    <div className="flex items-start gap-3">
                      <span className="w-3 h-3 rounded-full bg-[#FF3B30] mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase text-black/40">Recipient Facility</span>
                        <div 
                          onClick={() => onSelectPhc && onSelectPhc(tr.destination_phc)}
                          className="font-bold text-sm text-[#1D1D1F] hover:text-[#007AFF] cursor-pointer"
                        >
                          {tr.destination_phc_name || tr.destination_phc}
                        </div>
                        <div className="text-xs text-[#FF3B30] font-mono font-medium mt-0.5">
                          Critical need • {tr.destination_need || tr.quantity} units deficit
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approved status notice or Action Buttons */}
                  {isApproved ? (
                    <div className="pt-2 flex items-center justify-between text-xs text-[#34C759] font-bold">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Dispatched • SIMULATED OPERATIONAL ACTION</span>
                      </div>
                      <button
                        onClick={() => onOpenTransferDrawer && onOpenTransferDrawer(tr)}
                        className="text-black/50 hover:text-black font-semibold text-xs cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleReject(tr.transfer_id, e)}
                        disabled={processingId === tr.transfer_id}
                        className="px-3.5 py-1.5 rounded-full border border-black/10 hover:bg-black/5 text-black/60 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenTransferDrawer && onOpenTransferDrawer(tr)}
                          className="px-3.5 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#EAEAEA] text-black/70 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                        <button
                          onClick={(e) => handleApprove(tr.transfer_id, e)}
                          disabled={processingId === tr.transfer_id}
                          className="px-4 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{processingId === tr.transfer_id ? 'Authorizing...' : 'Approve Transfer'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
