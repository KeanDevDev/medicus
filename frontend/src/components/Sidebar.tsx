import React from 'react';
import { 
  BarChart3, Map, Building2, Stethoscope, Pill, 
  AlertTriangle, ArrowLeftRight, BedDouble, Users, 
  AlertOctagon, Network, FileText, History, Sparkles,
  ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';

export type NavTabKey = 
  | 'national' 
  | 'state' 
  | 'district' 
  | 'phc' 
  | 'medicines' 
  | 'risks'
  | 'recommendations' 
  | 'beds'
  | 'workforce'
  | 'simulator' 
  | 'federated' 
  | 'transparency' 
  | 'activity'
  | 'copilot';

interface Props {
  activeTab: NavTabKey;
  onTabChange: (tab: NavTabKey) => void;
  currentLang: Language;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  riskCount?: number;
  transferCount?: number;
}

interface NavItem {
  key: NavTabKey;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  currentLang,
  isCollapsed,
  onToggleCollapse,
  riskCount = 0,
  transferCount = 0,
}) => {
  const t = translations[currentLang];

  const groups: NavGroup[] = [
    {
      groupTitle: 'COMMAND',
      items: [
        { key: 'national', label: t.nav_national, icon: <BarChart3 className="w-4 h-4" /> },
        { key: 'state', label: t.nav_state, icon: <Map className="w-4 h-4" /> },
        { key: 'district', label: t.nav_district, icon: <Building2 className="w-4 h-4" /> },
        { key: 'phc', label: t.nav_phc, icon: <Stethoscope className="w-4 h-4" /> },
      ],
    },
    {
      groupTitle: 'RESOURCES',
      items: [
        { key: 'medicines', label: t.nav_medicines, icon: <Pill className="w-4 h-4" /> },
        { 
          key: 'risks', 
          label: t.nav_risks, 
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: riskCount > 0 ? riskCount : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        },
        { 
          key: 'recommendations', 
          label: t.nav_recommendations, 
          icon: <ArrowLeftRight className="w-4 h-4" />,
          badge: transferCount > 0 ? transferCount : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        },
        { key: 'beds', label: t.nav_beds, icon: <BedDouble className="w-4 h-4" /> },
        { key: 'workforce', label: t.nav_workforce, icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      groupTitle: 'RESPONSE',
      items: [
        { 
          key: 'simulator', 
          label: t.nav_simulator, 
          icon: <AlertOctagon className="w-4 h-4" />,
          badge: 'Sim',
          badgeColor: 'bg-cyan-500/20 text-cyan-300'
        },
      ],
    },
    {
      groupTitle: 'FEDERATED AI',
      items: [
        { 
          key: 'federated', 
          label: t.nav_federated, 
          icon: <Network className="w-4 h-4" />,
          badge: 'FedAvg',
          badgeColor: 'bg-emerald-500/20 text-emerald-300'
        },
      ],
    },
    {
      groupTitle: 'GOVERNANCE & AUDIT',
      items: [
        { key: 'transparency', label: t.nav_transparency, icon: <FileText className="w-4 h-4" /> },
        { key: 'activity', label: t.nav_activity, icon: <History className="w-4 h-4" /> },
        { 
          key: 'copilot', 
          label: t.nav_copilot, 
          icon: <Sparkles className="w-4 h-4" />,
          badge: 'AI',
          badgeColor: 'bg-indigo-500/20 text-indigo-300'
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-slate-900/95 border-r border-slate-800/90 flex flex-col flex-shrink-0 transition-all duration-300 select-none z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {groups.map((grp) => (
          <div key={grp.groupTitle}>
            {!isCollapsed && (
              <div className="text-[10px] font-bold tracking-wider text-slate-500 px-3 pb-1 uppercase font-mono">
                {grp.groupTitle}
              </div>
            )}
            <div className="space-y-0.5">
              {grp.items.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onTabChange(item.key)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all text-left ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold shadow-inner border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                    {isCollapsed && item.badge !== undefined && typeof item.badge === 'number' && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/60">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors font-medium"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-mono">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
