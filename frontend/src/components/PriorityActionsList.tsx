import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Truck, Check } from 'lucide-react';
import { TransferRow } from '../types';

interface Props {
  transfers: TransferRow[];
  onReviewTransfer: (transfer: TransferRow) => void;
}

export const PriorityActionsList: React.FC<Props> = ({ transfers, onReviewTransfer }) => {
  if (!transfers || transfers.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center text-black/50 border border-black/4 shadow-sm">
        <Check className="w-8 h-8 text-[#34C759] mx-auto mb-2" />
        <h4 className="font-bold text-[#1D1D1F] text-base">Network Operating Within Safety Margins</h4>
        <p className="text-xs text-black/40 mt-1">No emergency stock redistributions currently flagged.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Immediate Response
          </div>
          <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            Needs your attention
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#FF3B30] bg-[#FF3B30]/10 px-3 py-1 rounded-full font-mono">
          {transfers.length} Action Items
        </span>
      </div>

      {/* Horizontally scrolling priority action cards */}
      <div className="flex items-stretch gap-5 overflow-x-auto pb-4 scrollbar-none">
        {transfers.slice(0, 6).map((tr) => (
          <motion.div
            key={tr.transfer_id}
            whileHover={{ y: -3 }}
            className="flex-shrink-0 w-80 bg-white rounded-3xl p-5 shadow-sm border border-black/4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF3B30] bg-[#FF3B30]/10 px-2.5 py-0.5 rounded-full">
                  Critical Deficit
                </span>
                <span className="text-xs text-black/40 font-mono font-medium">
                  {tr.estimated_transport_distance} km
                </span>
              </div>

              <h4 className="text-base font-bold text-[#1D1D1F] mt-3">
                {tr.generic_name}
              </h4>
              <p className="text-xs text-black/50 mt-0.5 font-medium">
                Destination: <span className="text-[#1D1D1F] font-semibold">{tr.destination_phc_name || tr.destination_phc}</span>
              </p>

              {/* Transfer Flow */}
              <div className="mt-4 p-3 bg-[#F8F8FA] rounded-2xl space-y-1.5 text-xs text-black/70">
                <div className="flex items-center justify-between text-[11px] text-black/40">
                  <span>Donor facility</span>
                  <span className="text-[#34C759] font-bold font-mono">+{tr.source_surplus} surplus</span>
                </div>
                <div className="font-semibold text-[#1D1D1F] truncate">
                  {tr.source_phc_name || tr.source_phc}
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#007AFF] font-medium">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch {tr.quantity} {tr.unit}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-black/5 flex items-center justify-between">
              <span className="text-[11px] text-black/40">
                {tr.estimated_lead_time ? `${tr.estimated_lead_time} hrs delivery` : 'Rapid transit'}
              </span>
              <button
                onClick={() => onReviewTransfer(tr)}
                className="px-4 py-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-full text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Re-export as ApplePriorityActions for backward compatibility
export const ApplePriorityActions = PriorityActionsList;
