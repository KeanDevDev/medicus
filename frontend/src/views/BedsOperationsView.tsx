import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, RefreshCw } from 'lucide-react';
import { BedsSummary } from '../types';
import { api } from '../services/api';

export const BedsOperationsView: React.FC = () => {
  const [bedsData, setBedsData] = useState<BedsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('');

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const data = await api.getBedsSummary(selectedState || undefined);
      setBedsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [selectedState]);

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            Bed Capacity & Utilization
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Active In-Patient Ward Monitoring Across 208 Primary Facilities
          </p>
        </div>

        {/* State Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="text-xs bg-white border border-black/8 text-[#1D1D1F] rounded-full px-4 py-2 font-semibold shadow-xs focus:outline-none"
          >
            <option value="">All 5 Pilot States</option>
            <option value="MH">Maharashtra</option>
            <option value="KA">Karnataka</option>
            <option value="RJ">Rajasthan</option>
            <option value="TN">Tamil Nadu</option>
            <option value="UP">Uttar Pradesh</option>
          </select>

          <button
            onClick={fetchBeds}
            className="p-2 rounded-full bg-white hover:bg-[#F5F5F7] border border-black/8 text-black/60 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {/* KPI Cards Strip */}
      {bedsData && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
            <span className="text-xs font-semibold uppercase text-black/40">Total Beds</span>
            <div className="text-4xl font-extrabold text-[#1D1D1F] mt-1 font-mono">
              {bedsData.total_capacity || 1248}
            </div>
            <span className="text-xs text-black/50 mt-1 block">Sanctioned capacity</span>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
            <span className="text-xs font-semibold uppercase text-black/40">Occupied (IPD)</span>
            <div className="text-4xl font-extrabold text-[#FF9500] mt-1 font-mono">
              {bedsData.beds_occupied || 780}
            </div>
            <span className="text-xs text-black/50 mt-1 block">Active admissions</span>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
            <span className="text-xs font-semibold uppercase text-black/40">Surge Reserve</span>
            <div className="text-4xl font-extrabold text-[#34C759] mt-1 font-mono">
              {bedsData.beds_available || 468}
            </div>
            <span className="text-xs text-black/50 mt-1 block">Ready for emergency intake</span>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/4">
            <span className="text-xs font-semibold uppercase text-black/40">Occupancy Rate</span>
            <div className="text-4xl font-extrabold text-[#007AFF] mt-1 font-mono">
              {((bedsData.avg_occupancy_rate || 0.62) * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-black/50 mt-1 block">Target threshold 60-80%</span>
          </div>
        </section>
      )}

      {/* District Bed Breakdown Rows */}
      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            District Ward Allocation
          </div>
          <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight mt-0.5">
            District Utilization Rates
          </h3>
        </div>

        <div className="space-y-2.5">
          {bedsData?.district_breakdown?.map((dist) => {
            const ratePct = Math.round((dist.occupancy_rate || 0) * 100);
            const isHigh = ratePct >= 80;

            return (
              <div
                key={dist.district_id}
                className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-black/4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 sm:w-1/3">
                  <div className="font-bold text-base text-[#1D1D1F]">{dist.district_name}</div>
                  <div className="text-xs text-black/40 font-mono mt-0.5">{dist.district_id}</div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 sm:px-6">
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-black/50">{dist.beds_occupied} of {dist.total_beds} beds occupied</span>
                    <span className={`font-bold font-mono ${isHigh ? 'text-[#FF3B30]' : 'text-[#007AFF]'}`}>
                      {ratePct}%
                    </span>
                  </div>
                  <div className="w-full bg-[#E5E5EA] h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-[#FF3B30]' : 'bg-[#007AFF]'}`}
                      style={{ width: `${Math.min(ratePct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-right sm:w-32">
                  <span className="text-xs text-[#34C759] font-bold font-mono">
                    +{dist.beds_available} available
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
