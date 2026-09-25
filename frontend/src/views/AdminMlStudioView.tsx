import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ModelSpecification, CustomModelRun } from '../types';
import {
  Sparkles,
  Cpu,
  Upload,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  Table,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

export const AdminMlStudioView: React.FC = () => {
  const [activeModels, setActiveModels] = useState<ModelSpecification[]>([]);
  const [customRuns, setCustomRuns] = useState<CustomModelRun[]>([]);
  const [selectedModelIdx, setSelectedModelIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Custom training state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trainingInProgress, setTrainingInProgress] = useState<boolean>(false);
  const [trainResult, setTrainResult] = useState<CustomModelRun | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);

  const fetchModelsData = async () => {
    setLoading(true);
    try {
      const [models, runs] = await Promise.all([
        api.getAdminModels(),
        api.getCustomRuns()
      ]);
      setActiveModels(models);
      setCustomRuns(runs);
    } catch (err) {
      console.error('Failed to load ML studio models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelsData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setTrainError(null);
      setTrainResult(null);
    }
  };

  const handleUploadAndTrain = async () => {
    if (!selectedFile) {
      setTrainError('Please select a CSV dataset file first.');
      return;
    }
    setTrainingInProgress(true);
    setTrainError(null);
    try {
      const res = await api.trainCustomModel(selectedFile);
      setTrainResult(res);
      // Refresh runs list
      const updatedRuns = await api.getCustomRuns();
      setCustomRuns(updatedRuns);
    } catch (err: any) {
      setTrainError(err.message || 'Custom model validation/training failed');
    } finally {
      setTrainingInProgress(false);
    }
  };

  const currentModel = activeModels[selectedModelIdx];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Admin Model Operations & ML Studio
            </span>
            <span className="text-xs text-gray-400">• v2.0 Production</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            Federated Machine Learning & Calibrated Models
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Transparent architecture inspection, data provenance, validation metrics, and custom dataset training pipeline.
          </p>
        </div>

        <button
          onClick={fetchModelsData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Studio</span>
        </button>
      </div>

      {/* Model Selector Tabs */}
      {activeModels.length > 0 && (
        <div className="flex space-x-2 border-b border-gray-200/60 pb-2">
          {activeModels.map((m, idx) => (
            <button
              key={m.model_id}
              onClick={() => {
                setSelectedModelIdx(idx);
                setTrainResult(null);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                selectedModelIdx === idx
                  ? 'bg-[#0071E3] text-white shadow-2xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/70'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>{m.model_name}</span>
            </button>
          ))}
          <button
            onClick={() => setSelectedModelIdx(-1)}
            className={`px-4 py-2 rounded-2xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              selectedModelIdx === -1
                ? 'bg-[#0071E3] text-white shadow-2xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/70'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload & Train Custom Dataset</span>
          </button>
        </div>
      )}

      {/* Active Model Inspection Panel */}
      {selectedModelIdx >= 0 && currentModel && (
        <div className="space-y-6">
          {/* Top Specification Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Purpose & Algorithm */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Architecture</div>
              <div className="text-base font-bold text-gray-900">{currentModel.algorithm}</div>
              <div className="text-xs text-gray-600 leading-relaxed">{currentModel.type}</div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                <span className="font-semibold text-gray-700">Governance:</span> {currentModel.governance?.compliance || 'MoHFW Fair-AI Guidelines'}
              </div>
            </div>

            {/* Card 2: Training Data & Split */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Dataset Provenance</div>
              <div className="text-base font-bold text-gray-900">
                {currentModel.source_training_data?.records_count?.toLocaleString()} Records
              </div>
              <div className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Source:</span> {currentModel.source_training_data?.source}
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                <span className="font-semibold text-gray-700">Split:</span> {currentModel.train_val_test_split?.train_pct}% Train / {currentModel.train_val_test_split?.test_pct}% Test ({currentModel.train_val_test_split?.strategy})
              </div>
            </div>

            {/* Card 3: Target & Version */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200/70 shadow-2xs space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Target Variable</div>
              <div className="text-base font-bold text-[#0071E3] font-mono">{currentModel.target}</div>
              <div className="text-xs text-gray-600">
                Features ({currentModel.features?.length}): {currentModel.features?.slice(0, 3).join(', ')}...
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between">
                <span>Version: {currentModel.governance?.version}</span>
                <span>Active in Control Tower</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics & Confusion Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrics Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0071E3]" />
                  Quantitative Validation Metrics
                </h3>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
                  Verified On Unseen Test Split
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(currentModel.metrics || {}).map(([key, val]: [string, any]) => (
                  <div key={key} className="p-3 bg-gray-50/70 rounded-2xl border border-gray-100">
                    <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-lg font-bold text-gray-900 mt-1">
                      {typeof val === 'number' ? val.toFixed(val < 1 ? 4 : 2) : String(val)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Confusion Matrix (if classification) */}
              {currentModel.confusion_matrix && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Confusion Matrix (Classification)</h4>
                  <div className="inline-block border border-gray-200 rounded-xl overflow-hidden text-xs">
                    <table className="divide-y divide-gray-200 text-center">
                      <thead className="bg-gray-50 font-semibold text-gray-600">
                        <tr>
                          <th className="p-2 border-r border-gray-200 text-left">Actual \ Predicted</th>
                          {currentModel.confusion_matrix.labels.map((l: string) => (
                            <th key={l} className="p-2 border-r border-gray-200 last:border-r-0">{l}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentModel.confusion_matrix.matrix.map((row: number[], rIdx: number) => (
                          <tr key={rIdx}>
                            <td className="p-2 border-r border-gray-200 font-semibold bg-gray-50 text-left">
                              {currentModel.confusion_matrix?.labels[rIdx]}
                            </td>
                            {row.map((cell: number, cIdx: number) => (
                              <td 
                                key={cIdx} 
                                className={`p-2 border-r border-gray-200 last:border-r-0 font-medium ${
                                  rIdx === cIdx ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-gray-600'
                                }`}
                              >
                                {cell.toLocaleString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Importance & Explainability */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Feature Importance & Model Explainability
              </h3>
              <p className="text-xs text-gray-500">
                Relative contribution of operational inputs to final model prediction
              </p>

              <div className="space-y-2.5">
                {currentModel.feature_importance?.map((f) => {
                  const pct = Math.min(100, Math.round(f.importance * 100));
                  return (
                    <div key={f.feature} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-gray-700">{f.feature}</span>
                        <span className="font-semibold text-gray-900">{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#0071E3] h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sample Inference Table */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Table className="w-4 h-4 text-gray-600" />
              Live Prediction Verification Examples
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider font-semibold">
                    {currentModel.sample_predictions && currentModel.sample_predictions.length > 0 &&
                      Object.keys(currentModel.sample_predictions[0]).map((col) => (
                        <th key={col} className="py-2.5 pr-4">{col.replace(/_/g, ' ')}</th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentModel.sample_predictions?.map((pred, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      {Object.entries(pred).map(([k, v]: [string, any], j) => (
                        <td key={j} className="py-2.5 pr-4 text-gray-700">
                          {typeof v === 'number' ? (k.includes('prob') ? `${Math.round(v * 100)}%` : v.toFixed(2)) : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DATASET UPLOAD & TRAINING TAB */}
      {selectedModelIdx === -1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Custom Dataset Upload & Automated Training</h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload your own clinical, inventory, or epidemiological CSV. MEDICUS validates schema integrity, detects task type (classification or regression), performs train/test splits, trains an isolated model, and logs complete audit provenance.
              </p>
            </div>

            {trainError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{trainError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0071E3] hover:file:bg-blue-100 cursor-pointer"
              />
              <button
                onClick={handleUploadAndTrain}
                disabled={trainingInProgress || !selectedFile}
                className="px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold rounded-xl transition shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                {trainingInProgress ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validating & Training...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Validate & Train Model</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Training Results Display */}
          {trainResult && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Model Training & Validation Successful</span>
                </div>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                  Run ID: {trainResult.run_id}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Dataset</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5 truncate">{trainResult.uploaded_filename}</div>
                  <div className="text-xs text-gray-500">{trainResult.records_count} records ingested</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Inferred Task</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5 capitalize">{trainResult.task_type}</div>
                  <div className="text-xs text-gray-500">Auto-detected from labels</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Target Column</div>
                  <div className="text-sm font-bold text-[#0071E3] font-mono mt-0.5">{trainResult.target_column}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Isolation Status</div>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5">Audited & Isolated</div>
                </div>
              </div>

              {/* Metrics Output */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Performance Metrics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(trainResult.metrics || {}).map(([k, v]: [string, any]) => (
                    <div key={k} className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                      <div className="text-[11px] uppercase font-semibold text-blue-800">{k}</div>
                      <div className="text-lg font-bold text-blue-950 mt-1">
                        {typeof v === 'number' ? v.toFixed(3) : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Importance Output */}
              {trainResult.feature_importance && trainResult.feature_importance.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Feature Importances</h4>
                  <div className="space-y-2 max-w-xl">
                    {trainResult.feature_importance.slice(0, 5).map((f) => (
                      <div key={f.feature} className="flex justify-between items-center text-xs">
                        <span className="font-mono text-gray-700">{f.feature}</span>
                        <span className="font-semibold text-gray-900">{Math.round(f.importance * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historical Runs */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Custom Training Run History</h3>
            {customRuns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="py-2.5">Run ID</th>
                      <th className="py-2.5">File</th>
                      <th className="py-2.5">Task</th>
                      <th className="py-2.5">Records</th>
                      <th className="py-2.5">Timestamp</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customRuns.map((r) => (
                      <tr key={r.run_id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 font-mono text-gray-700">{r.run_id}</td>
                        <td className="py-2.5 font-medium text-gray-900">{r.uploaded_filename}</td>
                        <td className="py-2.5 capitalize">{r.task_type}</td>
                        <td className="py-2.5">{r.records_count}</td>
                        <td className="py-2.5 text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs">No custom models trained yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
