import React from 'react';
import { 
  BarChart3, Map, Building2, Stethoscope, Pill, 
  ArrowLeftRight, AlertOctagon, Network, FileText, MessageSquareCode 
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';

export type TabKey = 
  | 'national' 
  | 'state' 
  | 'district' 
  | 'phc' 
  | 'medicines' 
  | 'recommendations' 
  | 'simulator' 
  | 'federated' 
  | 'transparency' 
  | 'copilot';

interface Props {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  currentLang: Language;
}

export const Navigation: React.FC<Props> = ({ activeTab, onTabChange, currentLang }) => {
  const t = translations[currentLang];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'national', label: t.nav_national, icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'state', label: t.nav_state, icon: <Map className="w-4 h-4" /> },
    { key: 'district', label: t.nav_district, icon: <Building2 className="w-4 h-4" /> },
    { key: 'phc', label: t.nav_phc, icon: <Stethoscope className="w-4 h-4" /> },
    { key: 'medicines', label: t.nav_medicines, icon: <Pill className="w-4 h-4" /> },
    { key: 'recommendations', label: t.nav_recommendations, icon: <ArrowLeftRight className="w-4 h-4" /> },
    { key: 'simulator', label: t.nav_simulator, icon: <AlertOctagon className="w-4 h-4" />, badge: 'Sim' },
    { key: 'federated', label: t.nav_federated, icon: <Network className="w-4 h-4" />, badge: 'FedAvg' },
    { key: 'transparency', label: t.nav_transparency, icon: <FileText className="w-4 h-4" /> },
    { key: 'copilot', label: t.nav_copilot, icon: <MessageSquareCode className="w-4 h-4" />, badge: 'Gemini' },
  ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-[73px] z-40 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto px-4 flex space-x-1 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
