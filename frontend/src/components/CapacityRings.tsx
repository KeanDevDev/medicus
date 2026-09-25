import React from 'react';
import { motion } from 'framer-motion';

interface RingData {
  label: string;
  value: number; // percentage 0 - 100
  displayValue: string;
  subtext: string;
  color: string;
  trackColor: string;
  onClick?: () => void;
}

interface Props {
  bedsPct: number;
  bedsSubtext: string;
  medicinesPct: number;
  medicinesSubtext: string;
  workforcePct: number;
  workforceSubtext: string;
  onSelectMetric?: (metric: 'beds' | 'medicines' | 'workforce') => void;
}

export const CapacityRings: React.FC<Props> = ({
  bedsPct,
  bedsSubtext,
  medicinesPct,
  medicinesSubtext,
  workforcePct,
  workforceSubtext,
  onSelectMetric,
}) => {
  const rings: RingData[] = [
    {
      label: 'Beds',
      value: bedsPct,
      displayValue: `${Math.round(bedsPct)}%`,
      subtext: bedsSubtext,
      color: '#007AFF',
      trackColor: '#E5F1FF',
      onClick: () => onSelectMetric && onSelectMetric('beds'),
    },
    {
      label: 'Medicines',
      value: medicinesPct,
      displayValue: `${Math.round(medicinesPct)}%`,
      subtext: medicinesSubtext,
      color: '#34C759',
      trackColor: '#EAF8EE',
      onClick: () => onSelectMetric && onSelectMetric('medicines'),
    },
    {
      label: 'Workforce',
      value: workforcePct,
      displayValue: `${Math.round(workforcePct)}%`,
      subtext: workforceSubtext,
      color: '#5856D6',
      trackColor: '#EFEFFC',
      onClick: () => onSelectMetric && onSelectMetric('workforce'),
    },
  ];

  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {rings.map((ring, idx) => {
        const offset = circumference - (ring.value / 100) * circumference;

        return (
          <motion.div
            key={ring.label}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            onClick={ring.onClick}
            className="flex items-center gap-5 p-5 bg-white rounded-3xl shadow-sm border border-black/4 cursor-pointer hover:shadow-md transition-all"
          >
            {/* Circular Ring SVG */}
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
                {/* Background Track */}
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="transparent"
                  stroke={ring.trackColor}
                  strokeWidth={strokeWidth}
                />
                {/* Active Animated Ring */}
                <motion.circle
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="transparent"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.2, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  strokeLinecap="round"
                />
              </svg>

              {/* Value inside ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-[#1D1D1F] tracking-tight font-sans">
                  {ring.displayValue}
                </span>
              </div>
            </div>

            {/* Labels and metadata */}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
                Capacity Ring
              </div>
              <div className="text-lg font-bold text-[#1D1D1F] mt-0.5">
                {ring.label}
              </div>
              <p className="text-xs text-black/50 mt-1 line-clamp-2 leading-relaxed">
                {ring.subtext}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Re-export as AppleHealthRings for backward compatibility
export const AppleHealthRings = CapacityRings;
