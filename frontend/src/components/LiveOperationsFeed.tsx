import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Truck, AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface FeedItem {
  id: string;
  time: string;
  location: string;
  title: string;
  detail: string;
  type: 'critical' | 'transfer' | 'surge' | 'workforce';
}

interface Props {
  onSelectItem?: (item: FeedItem) => void;
}

export const LiveOperationsFeed: React.FC<Props> = ({ onSelectItem }) => {
  const feedItems: FeedItem[] = [
    {
      id: '1',
      time: '09:42',
      location: 'Belagavi Sector-1',
      title: 'Anti-Rabies Vaccine',
      detail: 'Critical • 1.5 days left',
      type: 'critical',
    },
    {
      id: '2',
      time: '09:39',
      location: 'Pune → Satara',
      title: 'ORS Rebalance Transfer',
      detail: '1,200 units dispatched',
      type: 'transfer',
    },
    {
      id: '3',
      time: '09:31',
      location: 'Kolhapur Rural PHC',
      title: 'OPD Caseload Surge',
      detail: 'Demand +27% vs 30d avg',
      type: 'surge',
    },
    {
      id: '4',
      time: '09:24',
      location: 'Karnataka State Node',
      title: 'Workforce Rollcall',
      detail: '95% clinical attendance',
      type: 'workforce',
    },
    {
      id: '5',
      time: '09:15',
      location: 'Jaipur Rural',
      title: 'Paracetamol Forecast',
      detail: 'Bounds recalculated [240, 360]',
      type: 'transfer',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-black/50">
            Live Operations Feed
          </span>
        </div>
        <span className="text-xs text-black/40 font-mono">Stream Active</span>
      </div>

      {/* Horizontal flowing stream */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
        {feedItems.map((item, idx) => {
          const isCritical = item.type === 'critical';
          const isTransfer = item.type === 'transfer';
          const isSurge = item.type === 'surge';

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              onClick={() => onSelectItem && onSelectItem(item)}
              className="flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-black/4 w-64 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-black/40">
                <span className="font-mono font-semibold">{item.time}</span>
                <span className="font-medium truncate max-w-[120px]">{item.location}</span>
              </div>

              <div className="mt-2.5">
                <div className="font-bold text-sm text-[#1D1D1F] truncate">
                  {item.title}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCritical
                        ? 'bg-[#FF3B30]'
                        : isTransfer
                        ? 'bg-[#007AFF]'
                        : isSurge
                        ? 'bg-[#FF9500]'
                        : 'bg-[#34C759]'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isCritical ? 'text-[#FF3B30] font-semibold' : 'text-black/60'
                    }`}
                  >
                    {item.detail}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Re-export as AppleLiveFeed for backward compatibility
export const AppleLiveFeed = LiveOperationsFeed;
