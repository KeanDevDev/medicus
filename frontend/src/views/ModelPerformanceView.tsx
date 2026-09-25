import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, TrendingUp, ShieldCheck, CheckCircle2, 
  BarChart2, Activity, Info, Sparkles 
} from 'lucide-react';
import { api } from '../services/api';

export const ModelPerformanceView: React.FC = () => {
  const [modelRegistry, setModelRegistry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await api.getModelMetrics();
      setModelRegistry(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
            Model Performance & Validation
          </h1>
          <p className="text-sm text-black/60 mt-1 font-medium">
            Rigorous Empirical Metrics • Hold-out Test Validation • No Hallucination Guarantees
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#EAF8EE] text-[#34C759] border border-[#34C759]/30 px-3 py-1.5 rounded-full font-bold">
            VALIDATED AGAINST HOLD-OUT SET
          </span>
        </div>
      </section>

      {/* Model 1: Demand Forecaster */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/5 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#007AFF]" />
              <h2 className="text-xl font-bold text-[#1D1D1F]">
                Healthcare Demand Forecaster (7-Day Horizon)
              </h2>
            </div>
            <p className="text-xs text-black/50 mt-1 font-mono">
              Model Type: HistGradientBoostingRegressor • Version: v1.0.0-hgb
            </p>
          </div>

          <span className="text-xs bg-[#007AFF]/10 text-[#007AFF] font-bold px-3 py-1 rounded-full font-mono self-start sm:self-center">
            278,376 Train / 62,390 Test
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4">
            <span className="text-[10px] font-bold uppercase text-black/40">Mean Absolute Error (MAE)</span>
            <div className="text-3xl font-extrabold text-[#007AFF] font-mono mt-1">20.97</div>
            <span className="text-[11px] text-[#34C759] font-medium mt-0.5 block">
              Outperforms baseline (21.36)
            </span>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4">
            <span className="text-[10px] font-bold uppercase text-black/40">Root Mean Sq Error (RMSE)</span>
            <div className="text-3xl font-extrabold text-[#1D1D1F] font-mono mt-1">32.01</div>
            <span className="text-[11px] text-black/50 font-medium mt-0.5 block">
              Residual Std Dev: 32.01
            </span>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4">
            <span className="text-[10px] font-bold uppercase text-black/40">sMAPE Error Rate</span>
            <div className="text-3xl font-extrabold text-[#34C759] font-mono mt-1">14.71%</div>
            <span className="text-[11px] text-black/50 font-medium mt-0.5 block">
              Symmetric percentage error
            </span>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4">
            <span className="text-[10px] font-bold uppercase text-black/40">Confidence Bounds</span>
            <div className="text-3xl font-extrabold text-[#5856D6] font-mono mt-1">95%</div>
            <span className="text-[11px] text-black/50 font-medium mt-0.5 block">
              Empirical interval [L, U]
            </span>
          </div>
        </div>

        {/* Feature Attribution List */}
        <div>
          <span className="text-xs font-bold text-[#1D1D1F] block mb-2">Input Features Utilized</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              'lag_1_demand', 'lag_7_demand', 'rolling_7_mean', 
              'opd_patients', 'disease_index', 'rainfall_mm', 
              'population_served', 'day_of_week', 'month'
            ].map(f => (
              <span key={f} className="text-xs bg-[#F5F5F7] text-black/70 px-3 py-1 rounded-full font-mono">
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Model 2: Stockout Classifier */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/5 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#34C759]" />
              <h2 className="text-xl font-bold text-[#1D1D1F]">
                Stock-out Risk Early Warning Classifier
              </h2>
            </div>
            <p className="text-xs text-black/50 mt-1 font-mono">
              Model Type: HistGradientBoostingClassifier • Horizon: 7 Days
            </p>
          </div>

          <span className="text-xs bg-[#34C759]/10 text-[#34C759] font-bold px-3 py-1 rounded-full font-mono self-start sm:self-center">
            AUC: 0.994
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4">
            <span className="text-[10px] font-bold uppercase text-black/40">Precision</span>
            <div className="text-3xl font-extrabold text-[#007AFF] font-mono mt-1">98.6%</div>
            <span className="text-[11px] text-black/50 font-medium mt-0.5 block">
              Low false alarm rate (FP=66)
            </span>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4">
            <span className="text-[10px] font-bold uppercase text-black/40">Recall (Sensitivity)</span>
            <div className="text-3xl font-extrabold text-[#34C759] font-mono mt-1">99.2%</div>
            <span className="text-[11px] text-black/50 font-medium mt-0.5 block">
              Catches 99.2% of impending stockouts
            </span>
          </div>

          <div className="p-4 bg-[#F8F8FA] rounded-2xl border border-black/4">
            <span className="text-[10px] font-bold uppercase text-black/40">F1-Score</span>
            <div className="text-3xl font-extrabold text-[#5856D6] font-mono mt-1">0.989</div>
            <span className="text-[11px] text-black/50 font-medium mt-0.5 block">
              Harmonic mean of precision & recall
            </span>
          </div>
        </div>

        {/* Confusion Matrix Table */}
        <div className="p-5 bg-[#F8F8FA] rounded-2xl border border-black/4 space-y-3">
          <span className="text-xs font-bold text-[#1D1D1F] block">
            Confusion Matrix (Hold-out Test Set: N = 62,390)
          </span>

          <div className="grid grid-cols-2 gap-3 max-w-md text-xs">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
              <span className="text-[10px] text-black/40 uppercase font-bold">True Negatives (TN)</span>
              <div className="text-xl font-bold font-mono text-[#1D1D1F] mt-0.5">57,540</div>
              <span className="text-[10px] text-[#34C759]">Correctly classified safe</span>
            </div>

            <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
              <span className="text-[10px] text-black/40 uppercase font-bold">False Positives (FP)</span>
              <div className="text-xl font-bold font-mono text-[#FF9500] mt-0.5">66</div>
              <span className="text-[10px] text-black/40">Safe marked as risk</span>
            </div>

            <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
              <span className="text-[10px] text-black/40 uppercase font-bold">False Negatives (FN)</span>
              <div className="text-xl font-bold font-mono text-[#FF3B30] mt-0.5">40</div>
              <span className="text-[10px] text-[#FF3B30]">Missed critical stockouts</span>
            </div>

            <div className="p-3 bg-white rounded-xl shadow-xs border border-black/4">
              <span className="text-[10px] text-black/40 uppercase font-bold">True Positives (TP)</span>
              <div className="text-xl font-bold font-mono text-[#34C759] mt-0.5">4,754</div>
              <span className="text-[10px] text-[#34C759]">Correctly caught stockouts</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
