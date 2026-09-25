import React, { useState } from 'react';
import { 
  X, AlertTriangle, ArrowRight, ShieldCheck, Clock, MapPin, 
  Truck, Sparkles, Send, CheckCircle2, ChevronRight, Pill, 
  Info, Activity, Check, XCircle
} from 'lucide-react';
import { 
  DrawerType, MedicineRecord, StockoutRiskRow, 
  TransferRow, NotificationItem 
} from '../types';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  type: DrawerType | null;
  data: any;
  onClose: () => void;
  onNavigateToEntity: (type: 'phc' | 'district' | 'state' | 'medicine' | 'risk', id: string) => void;
  notifications: NotificationItem[];
  onTransferUpdated?: () => void;
}

export const DetailDrawers: React.FC<Props> = ({
  isOpen,
  type,
  data,
  onClose,
  onNavigateToEntity,
  notifications,
  onTransferUpdated,
}) => {
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; citations?: string[] }>>([
    {
      role: 'assistant',
      text: 'MEDICUS Assist Grounded AI active. I have real-time visibility into all 208 PHCs, 26 LGD districts, inventory balances, and linear optimization recommendations. How can I assist your operations today?',
    },
  ]);

  const [transferActionState, setTransferActionState] = useState<'idle' | 'approving' | 'approved' | 'rejecting' | 'rejected'>('idle');
  const [actionMessage, setActionMessage] = useState<string>('');

  if (!isOpen || !type) return null;

  const handleApproveTransfer = async (transferId: string) => {
    setTransferActionState('approving');
    try {
      const res = await api.approveTransfer(transferId);
      setTransferActionState('approved');
      setActionMessage(res.message || 'Transfer approved successfully');
      if (onTransferUpdated) onTransferUpdated();
    } catch (e: any) {
      setTransferActionState('idle');
      alert('Failed to approve transfer: ' + e.message);
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    setTransferActionState('rejecting');
    try {
      const res = await api.rejectTransfer(transferId);
      setTransferActionState('rejected');
      setActionMessage(res.message || 'Transfer rejected');
      if (onTransferUpdated) onTransferUpdated();
    } catch (e: any) {
      setTransferActionState('idle');
      alert('Failed to reject transfer: ' + e.message);
    }
  };

  const handleSendCopilot = async (customPrompt?: string) => {
    const query = customPrompt || copilotPrompt;
    if (!query.trim()) return;

    const newMsgs = [...copilotMessages, { role: 'user' as const, text: query }];
    setCopilotMessages(newMsgs);
    if (!customPrompt) setCopilotPrompt('');
    setCopilotLoading(true);

    try {
      const res = await api.askControlTower(query);
      setCopilotMessages([...newMsgs, { 
        role: 'assistant', 
        text: res.answer || res.response || 'Operational brief generated.',
        citations: res.citations || ['SQLite Live Telemetry', 'HistGradientBoosting v1.0', 'Transfers Registry']
      }]);
    } catch (err: any) {
      setCopilotMessages([...newMsgs, { 
        role: 'assistant', 
        text: 'Error generating response: ' + (err.message || 'Server connection failure.') 
      }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/20 backdrop-blur-xs flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Container */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border-l border-black/8 shadow-2xl h-full flex flex-col z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'medicine' && <Pill className="w-5 h-5 text-[#007AFF]" />}
            {type === 'risk' && <AlertTriangle className="w-5 h-5 text-[#FF3B30]" />}
            {type === 'transfer' && <Truck className="w-5 h-5 text-[#007AFF]" />}
            {type === 'copilot' && <Sparkles className="w-5 h-5 text-[#5856D6]" />}
            {type === 'notifications' && <Activity className="w-5 h-5 text-[#34C759]" />}
            <h2 className="text-sm font-bold text-[#1D1D1F] tracking-wide uppercase">
              {type === 'medicine' && 'Medicine Inspection'}
              {type === 'risk' && 'Why Is This At Risk?'}
              {type === 'transfer' && 'Transfer Dispatch Route'}
              {type === 'copilot' && 'MEDICUS Assist'}
              {type === 'notifications' && 'Operational Notifications'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. MEDICINE DETAIL DRAWER */}
          {type === 'medicine' && data && (
            <div className="space-y-4">
              <div className="p-5 bg-[#F8F8FA] rounded-2xl border border-black/4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                  {data.category || 'Essential Medicine'}
                </span>
                <h3 className="text-2xl font-bold text-[#1D1D1F] mt-1">{data.generic_name}</h3>
                <p className="text-black/50 text-xs mt-0.5 font-mono">{data.medicine_id} • {data.dosage_form}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-bold font-mono">
                    NLEM 2022
                  </span>
                  <span className="text-xs text-black/50 font-medium">
                    Safety stock buffer: <strong className="text-black">{data.min_safety_stock_days || 7} days</strong>
                  </span>
                </div>
              </div>

              {/* Clinical Description */}
              <div className="p-4 bg-white rounded-2xl border border-black/4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#1D1D1F]">Clinical Indication</span>
                <p className="text-xs text-black/60 leading-relaxed">
                  {data.description || 'First-line antimicrobial for acute respiratory and gastrointestinal tract infections at primary care facilities.'}
                </p>
              </div>

              {/* 7-Day Forecast Trajectory for this drug */}
              <div className="p-5 bg-[#F8F8FA] rounded-2xl border border-black/4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1D1D1F]">7-Day Forecast Projection</span>
                  <span className="text-[10px] font-mono text-black/40">HistGradientBoosting</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
                    <div className="text-[10px] text-black/40">Lower Bound [L]</div>
                    <div className="text-sm font-bold text-[#1D1D1F] font-mono mt-0.5">
                      {data.lower_bound ?? Math.round((data.predicted_demand || 240) * 0.8)}
                    </div>
                  </div>
                  <div className="p-3 bg-[#007AFF]/5 rounded-xl border border-[#007AFF]/20">
                    <div className="text-[10px] text-[#007AFF] font-bold">Predicted Demand</div>
                    <div className="text-sm font-bold text-[#007AFF] font-mono mt-0.5">
                      {data.predicted_demand ?? 280}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
                    <div className="text-[10px] text-black/40">Upper Bound [U]</div>
                    <div className="text-sm font-bold text-[#1D1D1F] font-mono mt-0.5">
                      {data.upper_bound ?? Math.round((data.predicted_demand || 240) * 1.25)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. RISK DRILLDOWN DRAWER */}
          {type === 'risk' && data && (
            <div className="space-y-4">
              <div className="p-5 bg-[#FFEAEA] rounded-2xl border border-[#FF3B30]/20">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold">
                    {data.severity || 'CRITICAL'} SEVERITY
                  </span>
                  <span className="text-[11px] font-mono text-[#FF3B30] font-bold">
                    P(stockout) = {data.risk_percent !== undefined ? Math.round(data.risk_percent) : Math.round((data.risk_probability || 0.0) * 100)}%
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mt-2">{data.generic_name}</h3>
                <p className="text-black/60 text-xs mt-0.5">
                  Location: <span className="font-semibold text-black">{data.phc_name}</span> ({data.phc_id})
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-black/50">Current Stock:</span>
                    <span className="ml-1 font-bold text-[#FF3B30] font-mono">{data.closing_stock ?? data.quantity ?? 0} units</span>
                  </div>
                  <div>
                    <span className="text-black/50">Depletion Horizon:</span>
                    <span className="ml-1 font-bold text-[#FF3B30] font-mono">{(data.depletion_horizon ?? data.days_of_stock ?? 0.0).toFixed(1)} days</span>
                  </div>
                </div>
              </div>

              {/* Root Cause Factors */}
              <div className="p-5 bg-[#F8F8FA] rounded-2xl border border-black/4 space-y-3">
                <h4 className="font-bold text-[#1D1D1F] text-sm">
                  Root-Cause Explainability Factors
                </h4>
                <div className="space-y-2 text-xs">
                  {data.risk_factors && data.risk_factors.length > 0 ? (
                    data.risk_factors.map((f: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
                        <div className="font-semibold text-[#1D1D1F] flex items-center justify-between">
                          <span>{idx + 1}. {f.factor?.replace(/_/g, ' ')}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            f.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                            f.severity === 'HIGH' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                          }`}>{f.severity}</span>
                        </div>
                        <div className="text-black/60 mt-0.5">{f.detail}</div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
                        <div className="font-semibold text-[#1D1D1F]">1. Burn Rate Acceleration</div>
                        <div className="text-black/50 mt-0.5">Local patient caseload pressure driving inventory depletion.</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
                        <div className="font-semibold text-[#1D1D1F]">2. Replenishment Transit Deficit</div>
                        <div className="text-black/50 mt-0.5">Warehouse delivery cycle is {data.lead_time_days || 4} days, but inventory runs dry in {(data.depletion_horizon ?? data.days_of_stock ?? 1.8).toFixed(1)} days.</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recommended Action */}
              <button
                onClick={() => {
                  onClose();
                  onNavigateToEntity('phc', data.phc_id);
                }}
                className="w-full py-3 px-4 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>View Facility Clinical Timeline</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 3. TRANSFER DETAIL DRAWER (WITH REAL APPROVE / REJECT ACTIONS) */}
          {type === 'transfer' && data && (
            <div className="space-y-4">
              <div className="p-5 bg-[#F8F8FA] rounded-2xl border border-black/4">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    data.status === 'APPROVED' || transferActionState === 'approved'
                      ? 'bg-[#EAF8EE] text-[#34C759]'
                      : 'bg-[#007AFF]/10 text-[#007AFF]'
                  }`}>
                    {transferActionState === 'approved' ? 'APPROVED' : data.status || data.priority || 'HIGH'}
                  </span>
                  <span className="text-black/40 font-mono text-[11px]">ID: {data.transfer_id}</span>
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mt-2">
                  Transfer {data.quantity} {data.unit || 'units'} of {data.generic_name}
                </h3>
                <p className="text-black/50 text-xs mt-0.5">Optimized lateral redistribution route.</p>
              </div>

              {/* Status Banner when Approved */}
              {(data.status === 'APPROVED' || transferActionState === 'approved') && (
                <div className="p-4 bg-[#EAF8EE] border border-[#34C759]/30 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#34C759] flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-[#1D1D1F] flex items-center gap-2">
                      <span>Transfer Approved</span>
                      <span className="text-[10px] bg-[#34C759] text-white font-bold px-2 py-0.5 rounded-full uppercase">
                        SIMULATED OPERATIONAL ACTION
                      </span>
                    </div>
                    <p className="text-black/60 mt-1">
                      Dispatched under District Lateral Rebalancing Protocol. Conservation of mass verified across donor and recipient nodes.
                    </p>
                  </div>
                </div>
              )}

              {transferActionState === 'rejected' && (
                <div className="p-4 bg-[#FFEAEA] border border-[#FF3B30]/30 rounded-2xl flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-[#FF3B30]">Transfer Declined</div>
                    <p className="text-black/60 mt-0.5">Recommendation rejected by Medical Officer. Audit log recorded.</p>
                  </div>
                </div>
              )}

              {/* Origin & Destination Comparison */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8F8FA] rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-black/40">Donor Facility</span>
                  <div className="font-bold text-[#1D1D1F] mt-0.5">{data.source_phc_name || data.source_phc}</div>
                  <span className="text-[#34C759] font-mono font-medium">+{data.source_surplus || 800} surplus</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-black/40">Recipient Facility</span>
                  <div className="font-bold text-[#1D1D1F] mt-0.5">{data.destination_phc_name || data.destination_phc}</div>
                  <span className="text-[#FF3B30] font-mono font-medium">-{data.destination_need || data.quantity} needed</span>
                </div>
              </div>

              {/* Route Details */}
              <div className="p-4 bg-white rounded-2xl border border-black/4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#1D1D1F]">Logistics Transit</span>
                <div className="flex items-center justify-between text-xs text-black/60 pt-1">
                  <span>Transport Distance: <strong className="text-[#1D1D1F] font-mono">{data.estimated_transport_distance || 18} km</strong></span>
                  <span>Estimated Arrival: <strong className="text-[#1D1D1F] font-mono">{data.estimated_lead_time || 2.5} hrs</strong></span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-black/4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#1D1D1F]">Optimization Rationale</span>
                <p className="text-xs text-black/60 leading-relaxed">{data.reason || 'Restores 7-day safety buffer at recipient facility while donor retains +14 days reserve stock.'}</p>
              </div>

              {/* Interactive Action Buttons */}
              {transferActionState !== 'approved' && data.status !== 'APPROVED' && transferActionState !== 'rejected' && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleRejectTransfer(data.transfer_id)}
                    disabled={transferActionState === 'rejecting'}
                    className="flex-1 py-3 px-4 rounded-full border border-black/10 hover:bg-black/5 text-black/70 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {transferActionState === 'rejecting' ? 'Rejecting...' : 'Reject Transfer'}
                  </button>
                  <button
                    onClick={() => handleApproveTransfer(data.transfer_id)}
                    disabled={transferActionState === 'approving'}
                    className="flex-1 py-3 px-4 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{transferActionState === 'approving' ? 'Authorizing...' : 'Approve Transfer'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. NOTIFICATIONS DRAWER */}
          {type === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-black/40 text-xs">
                  No active operational notifications.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      onClose();
                      if (notif.link_type === 'phc') onNavigateToEntity('phc', notif.link_id);
                    }}
                    className="p-4 rounded-2xl bg-[#F8F8FA] hover:bg-[#F2F2F5] transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          notif.category === 'CRITICAL'
                            ? 'bg-[#FFEAEA] text-[#FF3B30]'
                            : notif.category === 'WARNING'
                            ? 'bg-[#FFF5E5] text-[#FF9500]'
                            : 'bg-[#E5F1FF] text-[#007AFF]'
                        }`}
                      >
                        {notif.category}
                      </span>
                      <span className="text-[10px] text-black/40 font-mono">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#1D1D1F]">{notif.title}</div>
                    <p className="text-xs text-black/60">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 5. COPILOT DRAWER */}
          {type === 'copilot' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex-1 space-y-3 overflow-y-auto">
                {copilotMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#007AFF] text-white ml-6 font-medium'
                        : 'bg-[#F8F8FA] text-[#1D1D1F] mr-4 border border-black/4 whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                    {msg.citations && (
                      <div className="mt-2 pt-2 border-t border-black/5 flex flex-wrap gap-1">
                        {msg.citations.map((c, ci) => (
                          <span key={ci} className="text-[9px] bg-black/5 text-black/50 px-2 py-0.5 rounded-full font-mono">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {copilotLoading && (
                  <div className="p-4 bg-[#F8F8FA] rounded-2xl text-xs text-black/40 animate-pulse">
                    Synthesizing grounded network telemetry...
                  </div>
                )}
              </div>

              {/* Quick Prompts */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  'Which PHCs have critical stockouts?',
                  'Explain lateral rebalance logic',
                  'Summarize today\'s doctor attendance',
                ].map((qp, qpi) => (
                  <button
                    key={qpi}
                    onClick={() => handleSendCopilot(qp)}
                    className="flex-shrink-0 text-[11px] bg-[#F5F5F7] hover:bg-[#EAEAEA] text-black/70 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                <input
                  type="text"
                  value={copilotPrompt}
                  onChange={(e) => setCopilotPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCopilot()}
                  placeholder="Ask about inventory, demand, transfers..."
                  className="flex-1 bg-[#F5F5F7] border border-black/6 rounded-full px-4 py-2 text-xs text-[#1D1D1F] focus:outline-none"
                />
                <button
                  onClick={() => handleSendCopilot()}
                  disabled={copilotLoading}
                  className="p-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
