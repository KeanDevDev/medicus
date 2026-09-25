import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Database, Cpu, Sparkles, 
  ExternalLink, CheckCircle2, AlertCircle, Table, Activity 
} from 'lucide-react';
import { api } from '../services/api';
import { DataStatusTag } from '../components/DataStatusTag';

export const TransparencyView: React.FC = () => {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransparencyData();
  }, []);

  const loadTransparencyData = async () => {
    setLoading(true);
    try {
      const sourcesRes = await api.getDataSources();
      setDataSources(sourcesRes.sources || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Title & Audit Compliance Banner */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            Data Sources & Provenance
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Strict Non-Hallucination Directive • 5-Tier Data Classification Standard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#EAF8EE] text-[#34C759] border border-[#34C759]/30 px-3.5 py-1.5 rounded-full font-bold">
            COMPLIANT: GoI Open Data Guidelines
          </span>
        </div>
      </section>

      {/* 5-Tier Data Classification Standard */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-black/4 shadow-sm space-y-1">
          <div className="font-bold text-[#007AFF] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>1. Verified Public Data</span>
          </div>
          <p className="text-black/60 leading-relaxed text-[11px]">
            HMIS 2023-24, Census 2011, LGD codes, NLEM 2022, and IMD historical weather records.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-black/4 shadow-sm space-y-1">
          <div className="font-bold text-[#34C759] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>2. Calibrated Simulation</span>
          </div>
          <p className="text-black/60 leading-relaxed text-[11px]">
            Statistically generated transactional footfalls, bed occupancy, and daily drug consumption distributions.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-black/4 shadow-sm space-y-1">
          <div className="font-bold text-[#5856D6] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>3. Derived Features</span>
          </div>
          <p className="text-black/60 leading-relaxed text-[11px]">
            Mathematical lag metrics, 7-day rolling statistics, and composite seasonal disease indices.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-black/4 shadow-sm space-y-1">
          <div className="font-bold text-[#FF9500] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>4. Model Predictions</span>
          </div>
          <p className="text-black/60 leading-relaxed text-[11px]">
            HistGradientBoosting 7-day demand projections with 95% confidence intervals and stockout probabilities.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-black/4 shadow-sm space-y-1">
          <div className="font-bold text-[#FF3B30] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>5. Scenario Simulations</span>
          </div>
          <p className="text-black/60 leading-relaxed text-[11px]">
            Emergency simulations (monsoon surges, floods, dengue outbreaks) strictly isolated with clear visual badges.
          </p>
        </div>
      </section>

      {/* Verified Government & Benchmark Data Sources */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <div>
            <h2 className="text-xl font-bold text-[#1D1D1F]">
              Verified Government Datasets & Standards
            </h2>
            <p className="text-xs text-black/50 mt-0.5">
              Authoritative sources establishing the spatial, administrative, and clinical foundations of MEDICUS.
            </p>
          </div>
          <span className="text-xs bg-[#EAF8EE] text-[#34C759] font-bold px-3 py-1 rounded-full">
            REAL DATA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#1D1D1F]">HMIS (Health Management Information System)</span>
              <span className="text-[10px] bg-black/5 text-black/60 font-mono px-2 py-0.5 rounded-full">MoHFW</span>
            </div>
            <p className="text-xs text-black/60 leading-relaxed">
              Provides historical outpatient volume, institutional delivery baselines, and bed capacity indicators across 5 pilot states.
            </p>
            <div className="text-[11px] text-[#007AFF] font-mono">Status: Verified Government Data</div>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#1D1D1F]">LGD (Local Government Directory)</span>
              <span className="text-[10px] bg-black/5 text-black/60 font-mono px-2 py-0.5 rounded-full">MoPR</span>
            </div>
            <p className="text-xs text-black/60 leading-relaxed">
              Standardized census codes, administrative district boundaries, and spatial hierarchy for 26 pilot districts.
            </p>
            <div className="text-[11px] text-[#007AFF] font-mono">Status: Verified Spatial Taxonomy</div>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#1D1D1F]">NLEM 2022 (National List of Essential Medicines)</span>
              <span className="text-[10px] bg-black/5 text-black/60 font-mono px-2 py-0.5 rounded-full">CDSCO</span>
            </div>
            <p className="text-xs text-black/60 leading-relaxed">
              Defines the 10 essential pharmaceutical formulations tracked across PHCs, including cold-chain vaccines and oral rehydration salts.
            </p>
            <div className="text-[11px] text-[#007AFF] font-mono">Status: National Clinical Formulary</div>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#1D1D1F]">IMD (India Meteorological Department)</span>
              <span className="text-[10px] bg-black/5 text-black/60 font-mono px-2 py-0.5 rounded-full">MoES</span>
            </div>
            <p className="text-xs text-black/60 leading-relaxed">
              Regional precipitation and monsoon timeline calibration powering the epidemic disease transmission indices.
            </p>
            <div className="text-[11px] text-[#007AFF] font-mono">Status: Meteorological Correlation</div>
          </div>
        </div>
      </section>

      {/* Disclaimers & Ethics */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#007AFF]" />
          <h3 className="font-bold text-sm text-[#1D1D1F]">Operational Scope & Safety Disclaimer</h3>
        </div>
        <p className="text-xs text-black/60 leading-relaxed">
          MEDICUS is designed strictly for resource optimization, supply chain coordination, and secondary operational analytics. It does not provide direct medical treatment or individual patient diagnosis. All synthetic components are calibrated using published Government of India health statistics and are explicitly watermarked.
        </p>
      </section>
    </div>
  );
};
