import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

interface FacilityPoint {
  id: string;
  name: string;
  stateId: string;
  x: number;
  y: number;
  status: 'normal' | 'warning' | 'critical';
  stockDays: number;
}

interface StateData {
  id: string;
  name: string;
  facilitiesCount: number;
  criticalCount: number;
  medicineAvailability: number;
  bedOccupancy: number;
  center: { x: number; y: number };
}

interface Props {
  onSelectState: (stateId: string) => void;
  selectedStateId?: string;
  onSelectPhc?: (phcId: string) => void;
}

export const MedicusIndiaMap: React.FC<Props> = ({
  onSelectState,
  selectedStateId,
  onSelectPhc,
}) => {
  const [hoveredState, setHoveredState] = useState<StateData | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<FacilityPoint | null>(null);

  const statesData: Record<string, StateData> = {
    MH: {
      id: 'MH',
      name: 'Maharashtra',
      facilitiesCount: 48,
      criticalCount: 3,
      medicineAvailability: 92,
      bedOccupancy: 70,
      center: { x: 380, y: 550 },
    },
    KA: {
      id: 'KA',
      name: 'Karnataka',
      facilitiesCount: 40,
      criticalCount: 1,
      medicineAvailability: 96,
      bedOccupancy: 64,
      center: { x: 390, y: 720 },
    },
    RJ: {
      id: 'RJ',
      name: 'Rajasthan',
      facilitiesCount: 42,
      criticalCount: 2,
      medicineAvailability: 88,
      bedOccupancy: 75,
      center: { x: 300, y: 360 },
    },
    TN: {
      id: 'TN',
      name: 'Tamil Nadu',
      facilitiesCount: 40,
      criticalCount: 2,
      medicineAvailability: 94,
      bedOccupancy: 68,
      center: { x: 430, y: 830 },
    },
    UP: {
      id: 'UP',
      name: 'Uttar Pradesh',
      facilitiesCount: 38,
      criticalCount: 4,
      medicineAvailability: 85,
      bedOccupancy: 82,
      center: { x: 480, y: 350 },
    },
  };

  // Facility dots
  const facilities: FacilityPoint[] = [
    // Maharashtra
    { id: 'SIM-PHC-MH-PUN-001', name: 'PHC Baner', stateId: 'MH', x: 375, y: 545, status: 'critical', stockDays: 1.8 },
    { id: 'SIM-PHC-MH-PUN-002', name: 'PHC Hinjawadi', stateId: 'MH', x: 365, y: 540, status: 'warning', stockDays: 3.4 },
    { id: 'SIM-PHC-MH-PUN-003', name: 'PHC Wagholi', stateId: 'MH', x: 388, y: 552, status: 'normal', stockDays: 8.5 },
    { id: 'SIM-PHC-MH-NSK-001', name: 'PHC Ozar', stateId: 'MH', x: 360, y: 510, status: 'normal', stockDays: 12.0 },
    { id: 'SIM-PHC-MH-NAG-001', name: 'PHC Kamptee', stateId: 'MH', x: 430, y: 515, status: 'warning', stockDays: 4.2 },
    // Karnataka
    { id: 'SIM-PHC-KA-BLR-001', name: 'PHC Whitefield', stateId: 'KA', x: 410, y: 730, status: 'normal', stockDays: 14.2 },
    { id: 'SIM-PHC-KA-BLR-002', name: 'PHC Yelahanka', stateId: 'KA', x: 405, y: 720, status: 'normal', stockDays: 9.8 },
    { id: 'SIM-PHC-KA-BEL-001', name: 'PHC Belagavi Urban', stateId: 'KA', x: 370, y: 680, status: 'critical', stockDays: 2.1 },
    { id: 'SIM-PHC-KA-MYS-001', name: 'PHC Chamundi', stateId: 'KA', x: 395, y: 755, status: 'normal', stockDays: 11.0 },
    // Rajasthan
    { id: 'SIM-PHC-RJ-JAI-001', name: 'PHC Sanganer', stateId: 'RJ', x: 310, y: 350, status: 'critical', stockDays: 1.5 },
    { id: 'SIM-PHC-RJ-JAI-002', name: 'PHC Amer', stateId: 'RJ', x: 315, y: 340, status: 'normal', stockDays: 7.6 },
    { id: 'SIM-PHC-RJ-JOD-001', name: 'PHC Mandore', stateId: 'RJ', x: 275, y: 370, status: 'warning', stockDays: 4.0 },
    // Tamil Nadu
    { id: 'SIM-PHC-TN-CHE-001', name: 'PHC Guindy', stateId: 'TN', x: 450, y: 790, status: 'normal', stockDays: 10.4 },
    { id: 'SIM-PHC-TN-CBE-001', name: 'PHC Peelamedu', stateId: 'TN', x: 415, y: 830, status: 'critical', stockDays: 1.9 },
    { id: 'SIM-PHC-TN-MAD-001', name: 'PHC Thirupparankundram', stateId: 'TN', x: 430, y: 860, status: 'normal', stockDays: 8.9 },
    // Uttar Pradesh
    { id: 'SIM-PHC-UP-LKO-001', name: 'PHC Gomti Nagar', stateId: 'UP', x: 475, y: 350, status: 'critical', stockDays: 2.0 },
    { id: 'SIM-PHC-UP-VAR-001', name: 'PHC Sarnath', stateId: 'UP', x: 520, y: 370, status: 'warning', stockDays: 3.8 },
    { id: 'SIM-PHC-UP-AGR-001', name: 'PHC Tajganj', stateId: 'UP', x: 435, y: 335, status: 'normal', stockDays: 9.1 },
  ];

  return (
    <div className="relative w-full h-full min-h-[520px] bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 flex flex-col justify-between overflow-hidden">
      {/* Top Map Context Header */}
      <div className="flex items-center justify-between z-10">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Federated Topology
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            5 Pilot States • 208 Facilities
          </h2>
          <p className="text-xs text-black/50 mt-1">
            Edge nodes actively training localized models with zero raw patient data sharing
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 bg-[#F8F8FA] px-3.5 py-1.5 rounded-full text-xs font-medium text-black/70 border border-black/4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
            <span>Optimal</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF9500]" />
            <span>Watch</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
            <span>Critical</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 flex items-center justify-center">
        <svg
          viewBox="150 150 500 750"
          className="w-full h-full max-h-[460px] object-contain drop-shadow-xs"
        >
          <defs>
            <linearGradient id="medicusStateGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#007AFF" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#34C759" stopOpacity="0.06" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* India Ambient Outline */}
          <path
            d="M 330 180 L 370 200 L 410 210 L 430 240 L 420 270 L 460 275 L 500 290 L 530 320 L 560 360 L 570 410 L 540 440 L 530 480 L 510 520 L 480 580 L 450 670 L 440 760 L 430 830 L 420 890 L 410 880 L 380 770 L 350 670 L 330 580 L 300 520 L 260 480 L 230 430 L 240 370 L 270 320 L 290 280 L 310 230 Z"
            fill="#F8F8FA"
            stroke="#E5E5EA"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* State Regions: Handcrafted smooth shapes */}
          {/* Rajasthan */}
          <path
            d="M 260 320 Q 340 310 350 360 Q 320 420 280 410 Q 250 360 260 320 Z"
            fill={selectedStateId === 'RJ' ? '#007AFF22' : '#007AFF0D'}
            stroke="#007AFF44"
            strokeWidth={selectedStateId === 'RJ' ? '2.5' : '1.5'}
            className="cursor-pointer hover:fill-[#007AFF28] transition-colors"
            onMouseEnter={() => setHoveredState(statesData.RJ)}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onSelectState('RJ')}
          />
          <text x="300" y="365" fontSize="12" fill="#1D1D1F" opacity="0.6" fontWeight="600" textAnchor="middle">
            Rajasthan
          </text>

          {/* Uttar Pradesh */}
          <path
            d="M 430 310 Q 530 310 540 380 Q 480 410 440 390 Q 420 350 430 310 Z"
            fill={selectedStateId === 'UP' ? '#007AFF22' : '#007AFF0D'}
            stroke="#007AFF44"
            strokeWidth={selectedStateId === 'UP' ? '2.5' : '1.5'}
            className="cursor-pointer hover:fill-[#007AFF28] transition-colors"
            onMouseEnter={() => setHoveredState(statesData.UP)}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onSelectState('UP')}
          />
          <text x="485" y="355" fontSize="12" fill="#1D1D1F" opacity="0.6" fontWeight="600" textAnchor="middle">
            Uttar Pradesh
          </text>

          {/* Maharashtra */}
          <path
            d="M 330 500 Q 440 480 450 540 Q 420 610 350 600 Q 320 540 330 500 Z"
            fill={selectedStateId === 'MH' ? '#007AFF28' : '#007AFF12'}
            stroke="#007AFF66"
            strokeWidth={selectedStateId === 'MH' ? '2.5' : '1.5'}
            className="cursor-pointer hover:fill-[#007AFF33] transition-colors"
            onMouseEnter={() => setHoveredState(statesData.MH)}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onSelectState('MH')}
          />
          <text x="385" y="555" fontSize="13" fill="#1D1D1F" opacity="0.75" fontWeight="700" textAnchor="middle">
            Maharashtra
          </text>

          {/* Karnataka */}
          <path
            d="M 350 640 Q 420 640 410 750 Q 370 770 360 710 Q 340 680 350 640 Z"
            fill={selectedStateId === 'KA' ? '#007AFF22' : '#007AFF0D'}
            stroke="#007AFF44"
            strokeWidth={selectedStateId === 'KA' ? '2.5' : '1.5'}
            className="cursor-pointer hover:fill-[#007AFF28] transition-colors"
            onMouseEnter={() => setHoveredState(statesData.KA)}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onSelectState('KA')}
          />
          <text x="380" y="710" fontSize="12" fill="#1D1D1F" opacity="0.6" fontWeight="600" textAnchor="middle">
            Karnataka
          </text>

          {/* Tamil Nadu */}
          <path
            d="M 400 780 Q 470 780 460 880 Q 410 880 400 830 Z"
            fill={selectedStateId === 'TN' ? '#007AFF22' : '#007AFF0D'}
            stroke="#007AFF44"
            strokeWidth={selectedStateId === 'TN' ? '2.5' : '1.5'}
            className="cursor-pointer hover:fill-[#007AFF28] transition-colors"
            onMouseEnter={() => setHoveredState(statesData.TN)}
            onMouseLeave={() => setHoveredState(null)}
            onClick={() => onSelectState('TN')}
          />
          <text x="430" y="835" fontSize="12" fill="#1D1D1F" opacity="0.6" fontWeight="600" textAnchor="middle">
            Tamil Nadu
          </text>

          {/* Facility Circular Point Indicators */}
          {facilities.map((fac) => {
            const isCritical = fac.status === 'critical';
            const isWarning = fac.status === 'warning';
            const fillColor = isCritical ? '#FF3B30' : isWarning ? '#FF9500' : '#007AFF';

            return (
              <g
                key={fac.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(fac)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => {
                  if (onSelectPhc) onSelectPhc(fac.id);
                  onSelectState(fac.stateId);
                }}
              >
                {/* Ripple ring for critical */}
                {isCritical && (
                  <circle
                    cx={fac.x}
                    cy={fac.y}
                    r="9"
                    fill="none"
                    stroke="#FF3B30"
                    strokeWidth="1.5"
                    opacity="0.4"
                    className="animate-ping"
                  />
                )}
                <circle
                  cx={fac.x}
                  cy={fac.y}
                  r={isCritical ? '4.5' : '3.5'}
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="transition-transform duration-200 hover:scale-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Information Floating Bubble for State */}
        <AnimatePresence>
          {hoveredState && !hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-black/6 text-xs w-60 z-30"
              style={{
                left: '60%',
                top: '40%',
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-black/5">
                <span className="font-bold text-sm text-[#1D1D1F]">{hoveredState.name}</span>
                <span className="text-[10px] uppercase font-bold text-black/40">State Node</span>
              </div>
              <div className="mt-2.5 space-y-1.5 text-black/70">
                <div className="flex justify-between">
                  <span>Monitored PHCs:</span>
                  <span className="font-bold text-black font-mono">{hoveredState.facilitiesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical Stock Risks:</span>
                  <span className="font-bold text-[#FF3B30] font-mono">{hoveredState.criticalCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medicine Coverage:</span>
                  <span className="font-bold text-[#34C759] font-mono">{hoveredState.medicineAvailability}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Bed Occupancy:</span>
                  <span className="font-bold text-[#007AFF] font-mono">{hoveredState.bedOccupancy}%</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-black/5 text-[11px] text-[#007AFF] font-semibold flex items-center gap-1">
                <span>Click to inspect state</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          )}

          {/* Hover Information Floating Bubble for Facility Point */}
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-black/6 text-xs w-56 z-30"
              style={{
                left: `${(hoveredPoint.x / 500) * 80}%`,
                top: `${(hoveredPoint.y / 750) * 80}%`,
              }}
            >
              <div className="font-bold text-[#1D1D1F] truncate">{hoveredPoint.name}</div>
              <div className="text-[10px] text-black/40 font-mono mt-0.5">{hoveredPoint.id}</div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-black/60">Stock buffer:</span>
                <span className={`font-bold font-mono ${hoveredPoint.status === 'critical' ? 'text-[#FF3B30]' : 'text-[#007AFF]'}`}>
                  {hoveredPoint.stockDays} days
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-xs text-black/40 z-10 pt-2">
        Click any state or facility point to smoothly zoom into localized operational details
      </div>
    </div>
  );
};

// Re-export as AppleIndiaMap for backward compatibility
export const AppleIndiaMap = MedicusIndiaMap;
