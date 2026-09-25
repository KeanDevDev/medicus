import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, 
  ZAxis, Tooltip, CartesianGrid, Cell, ReferenceArea, ReferenceLine 
} from 'recharts';
import { AlertTriangle, ChevronRight, Search, HelpCircle, RefreshCw, Info, Layers } from 'lucide-react';
import { StockoutRiskRow } from '../types';
import { api } from '../services/api';

interface Props {
  onSelectPhc: (phcId: string) => void;
  onOpenRiskDrawer?: (risk: StockoutRiskRow) => void;
}

export const StockoutRiskMatrixView: React.FC<Props> = ({ onSelectPhc, onOpenRiskDrawer }) => {
  const [risks, setRisks] = useState<StockoutRiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  useEffect(() => {
    fetchRisks();
  }, [severityFilter]);

  const fetchRisks = async () => {
    setLoading(true);
    try {
      const data = await api.getStockoutRisks(severityFilter || undefined, 100);
      setRisks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = risks.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.generic_name.toLowerCase().includes(q) ||
      r.phc_name.toLowerCase().includes(q) ||
      r.district_name.toLowerCase().includes(q)
    );
  });

  // Data formatted for 2D Scatter Matrix
  const scatterPoints = filtered.map((r) => {
    const horizon = r.depletion_horizon !== undefined ? r.depletion_horizon : r.days_of_stock;
    const pct = r.risk_percent !== undefined ? Math.round(r.risk_percent) : Math.round((r.risk_probability || 0) * 100);
    return {
      x: Math.min(Math.max(horizon !== undefined && horizon !== null ? horizon : 1.5, 0), 15),
      y: pct,
      name: r.generic_name,
      facility: r.phc_name,
      district: r.district_name,
      severity: r.severity,
      raw: r,
    };
  });

  const getPointColor = (severity: string) => {
    if (severity === 'CRITICAL') return '#FF3B30';
    if (severity === 'HIGH') return '#FF9500';
    if (severity === 'WATCH') return '#FFCC00';
    return '#34C759';
  };

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pt = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-black/8 text-xs space-y-1 z-50">
          <div className="font-bold text-[#1D1D1F] text-sm">{pt.name}</div>
          <div className="text-black/50 text-[11px] font-mono">{pt.facility} • {pt.district}</div>
          <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-4">
            <span className="text-black/60">Days remaining:</span>
            <span className="font-bold font-mono text-[#FF3B30]">{pt.x.toFixed(1)} days</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-black/60">Stockout Risk:</span>
            <span className="font-bold font-mono text-[#007AFF]">{pt.y}%</span>
          </div>
          <div className="text-[10px] text-[#007AFF] font-semibold pt-1">
            Click to inspect root causes ⓘ
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            Stock-out Risk Matrix
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            2D Early Warning Classification • Days of Stock vs Stock-out Probability
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search facility or drug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-black/8 rounded-full px-4 py-2 text-xs text-[#1D1D1F] placeholder-black/40 shadow-xs focus:outline-none w-48 sm:w-60"
          />

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-black/8 rounded-full px-4 py-2 text-xs text-[#1D1D1F] font-semibold shadow-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical (&lt;2d)</option>
            <option value="HIGH">High (2-5d)</option>
            <option value="WATCH">Watch (5-7d)</option>
            <option value="NORMAL">Normal (&gt;7d)</option>
          </select>
        </div>
      </section>

      {/* 2D Interactive Scatter Matrix Visualization */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
              Interactive 2D Matrix
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
              Depletion Horizon vs Probability of Zero Inventory
            </h2>
            <p className="text-xs text-black/50 mt-0.5">
              Points in the upper-left red quadrant represent critical stock-out threats needing urgent lateral redistribution.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]" />
              <span>Critical</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
              <span>High</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              <span>Normal</span>
            </span>
          </div>
        </div>

        {/* Matrix Scatter Canvas */}
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2" />
              
              {/* Highlight Critical Zone (Upper Left) */}
              <ReferenceArea
                x1={0}
                x2={3}
                y1={70}
                y2={100}
                fill="#FF3B30"
                fillOpacity={0.07}
                stroke="#FF3B30"
                strokeDasharray="4 4"
                strokeOpacity={0.3}
              />

              <XAxis
                type="number"
                dataKey="x"
                name="Days Remaining"
                domain={[0, 15]}
                unit="d"
                stroke="#8E8E93"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E5EA' }}
                label={{ value: 'Days of Stock Remaining (Depletion Horizon)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#8E8E93' }}
              />

              <YAxis
                type="number"
                dataKey="y"
                name="Risk Probability"
                domain={[0, 100]}
                unit="%"
                stroke="#8E8E93"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E5EA' }}
                label={{ value: 'Stock-out Risk Probability %', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#8E8E93' }}
              />

              <Tooltip content={<CustomScatterTooltip />} />

              <Scatter
                data={scatterPoints}
                onClick={(pt: any) => onOpenRiskDrawer && onOpenRiskDrawer(pt.raw)}
                cursor="pointer"
              >
                {scatterPoints.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getPointColor(entry.severity)}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="text-center text-xs text-black/40 pt-1">
          Click any point in the matrix to inspect root-cause explainability factors and trigger rebalancing
        </div>
      </section>

      {/* Risk Rows Listing */}
      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-black/40 px-1">
          Identified Facility Drug Risks ({filtered.length})
        </div>

        {loading ? (
          <div className="p-16 text-center text-black/40 text-xs">Evaluating network depletion trajectories...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-black/50 border border-black/4 shadow-sm">
            <h4 className="font-bold text-[#1D1D1F] text-base">No Stock-out Risks Found</h4>
            <p className="text-xs text-black/40 mt-1">All facilities operating above reorder levels.</p>
          </div>
        ) : (
          filtered.map((r) => {
            const isCritical = r.severity === 'CRITICAL';
            const isHigh = r.severity === 'HIGH';

            return (
              <motion.div
                key={r.risk_id}
                whileHover={{ y: -1.5 }}
                className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-black/4 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      isCritical
                        ? 'bg-[#FFEAEA] text-[#FF3B30]'
                        : isHigh
                        ? 'bg-[#FFF5E5] text-[#FF9500]'
                        : 'bg-[#E5F1FF] text-[#007AFF]'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[#1D1D1F]">
                        {r.generic_name}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isCritical
                            ? 'bg-[#FFEAEA] text-[#FF3B30]'
                            : isHigh
                            ? 'bg-[#FFF5E5] text-[#FF9500]'
                            : 'bg-[#EAF8EE] text-[#34C759]'
                        }`}
                      >
                        {r.severity}
                      </span>
                    </div>
                    <div className="text-xs text-black/50 mt-0.5">
                      <span 
                        onClick={() => onSelectPhc(r.phc_id)}
                        className="hover:underline font-semibold cursor-pointer text-black"
                      >
                        {r.phc_name}
                      </span>
                      {' • '}
                      <span>{r.district_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div className="text-left sm:text-right">
                    <div className="text-black/40 text-[10px] uppercase font-bold">Depletion Horizon</div>
                    <div className="font-bold text-[#FF3B30] font-mono text-sm">
                      {(r.days_of_stock || 1.8).toFixed(1)} days
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-black/40 text-[10px] uppercase font-bold">Risk Prob</div>
                    <div className="font-bold text-[#007AFF] font-mono text-sm">
                      {Math.round((r.risk_probability || 0.85) * 100)}%
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenRiskDrawer && onOpenRiskDrawer(r)}
                    className="p-2 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors cursor-pointer"
                    title="Inspect Root Causes"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </section>
    </div>
  );
};
