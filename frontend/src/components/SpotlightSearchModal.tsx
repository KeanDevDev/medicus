import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Building, Pill, AlertTriangle, ArrowRight } from 'lucide-react';
import { SearchResult } from '../types';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToEntity: (type: 'phc' | 'district' | 'state' | 'medicine' | 'risk', id: string) => void;
}

export const SpotlightSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigateToEntity,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query);
        setResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/25 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Spotlight Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-black/8 overflow-hidden z-10 flex flex-col max-h-[540px]"
      >
        {/* Search Input Bar */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-black/5">
          <Search className="w-5 h-5 text-black/40" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PHCs, districts, medicines, alerts..."
            className="flex-1 bg-transparent text-sm text-[#1D1D1F] placeholder-black/40 focus:outline-none font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-black/5 text-black/40 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] bg-[#F5F5F7] text-black/40 px-2 py-0.5 rounded-full font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
          {loading && (
            <div className="p-6 text-center text-black/40 text-xs">
              Searching national telemetry...
            </div>
          )}

          {!loading && results && (
            <>
              {results.phcs.length === 0 &&
                results.districts.length === 0 &&
                results.medicines.length === 0 &&
                results.alerts.length === 0 && (
                  <div className="p-8 text-center text-black/40 text-xs">
                    No matching facilities or drugs found for "{query}".
                  </div>
                )}

              {/* PHCs */}
              {results.phcs.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black/40 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>Facilities ({results.phcs.length})</span>
                  </div>
                  {results.phcs.map((phc) => (
                    <div
                      key={phc.phc_id}
                      onClick={() => {
                        onClose();
                        onNavigateToEntity('phc', phc.phc_id);
                      }}
                      className="px-3.5 py-2.5 rounded-2xl hover:bg-[#F5F5F7] cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-[#1D1D1F] text-sm">{phc.phc_name}</div>
                        <div className="text-black/40 font-mono text-[11px]">
                          {phc.phc_id} • {phc.district_name}, {phc.state_name}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-black/30" />
                    </div>
                  ))}
                </div>
              )}

              {/* Medicines */}
              {results.medicines.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black/40 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-[#34C759]" />
                    <span>Essential Medicines ({results.medicines.length})</span>
                  </div>
                  {results.medicines.map((med) => (
                    <div
                      key={med.medicine_id}
                      onClick={() => {
                        onClose();
                        onNavigateToEntity('medicine', med.medicine_id);
                      }}
                      className="px-3.5 py-2.5 rounded-2xl hover:bg-[#F5F5F7] cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-[#1D1D1F] text-sm">{med.generic_name}</div>
                        <div className="text-black/40 text-[11px]">{med.dosage_form} • {med.category}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-black/30" />
                    </div>
                  ))}
                </div>
              )}

              {/* Alerts */}
              {results.alerts.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF3B30] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Critical Alerts ({results.alerts.length})</span>
                  </div>
                  {results.alerts.map((al) => (
                    <div
                      key={al.risk_id}
                      onClick={() => {
                        onClose();
                        onNavigateToEntity('risk', al.risk_id);
                      }}
                      className="px-3.5 py-2.5 rounded-2xl bg-[#FFEAEA]/40 hover:bg-[#FFEAEA] cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-bold text-[#FF3B30] text-sm">{al.generic_name} at {al.phc_name}</div>
                        <div className="text-black/50 font-mono text-[11px]">{al.days_of_stock} days stock remaining</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#FF3B30]" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!query && (
            <div className="p-8 text-center text-black/40 text-xs">
              Type to search 208 primary health facilities, districts, medicines, and alerts.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Re-export as AppleSearchModal for backward compatibility
export const AppleSearchModal = SpotlightSearchModal;
