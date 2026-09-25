import React, { useState } from 'react';
import { Shield, RotateCcw, Zap, Globe, Sparkles, HelpCircle } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { api } from '../services/api';

interface Props {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onRefreshData: () => void;
  onOpenJudgeTour: () => void;
}

export const Header: React.FC<Props> = ({
  currentLang,
  onLanguageChange,
  onRefreshData,
  onOpenJudgeTour,
}) => {
  const t = translations[currentLang];
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await api.resetDemo();
      onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSeedMonsoon = async () => {
    setIsSeeding(true);
    try {
      await api.seedDemo('SCN_MONSOON');
      onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      {/* Top Banner: Official Classification & Disclaimer */}
      <div className="bg-slate-950 px-4 py-1 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 tracking-wider">● OPERATIONAL TELEMETRY: ACTIVE</span>
          <span className="text-slate-600">|</span>
          <span>PILOT DEPLOYMENT: 5 STATES (MH, KA, RJ, TN, UP) • 26 LGD DISTRICTS • 208 PHCs</span>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span className="text-slate-400 font-mono">MODEL: HistGradientBoosting v1.0 • FedAvg v3.0</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 truncate max-w-sm">{t.disclaimer}</span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                {t.app_title}
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  Control Tower
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t.app_subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls & Language Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Gemini AI Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Google Gemini 3.8 Flash</span>
          </div>

          {/* Quick Demo Controls for Judges */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-md border border-slate-800">
            <button
              onClick={onOpenJudgeTour}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/70 hover:bg-amber-900 transition-colors"
              title="Open 30-Second Judge Tour"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.judge_mode}</span>
            </button>

            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              title="Reset state to Normal baseline"
            >
              <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t.reset_demo}</span>
            </button>

            <button
              onClick={handleSeedMonsoon}
              disabled={isSeeding}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition-colors disabled:opacity-50"
              title="Trigger Heavy Monsoon Surge emergency scenario"
            >
              <Zap className={`w-3 h-3 text-cyan-400 ${isSeeding ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{t.seed_monsoon}</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-md border border-slate-700">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                currentLang === 'en' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                currentLang === 'hi' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => onLanguageChange('mr')}
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                currentLang === 'mr' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              मराठी
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
