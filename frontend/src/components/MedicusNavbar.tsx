import React, { useState } from 'react';
import { 
  Search, Bell, Sparkles, HelpCircle, 
  ChevronDown, CheckCircle2, MoreHorizontal 
} from 'lucide-react';
import { Language, getTranslation } from '../i18n/translations';
import { UserRole } from '../types';

export type MedicusNavKey = 
  | 'national' 
  | 'state' 
  | 'district' 
  | 'phc' 
  | 'medicines' 
  | 'risks' 
  | 'redistribution' 
  | 'capacity' 
  | 'workforce' 
  | 'emergency' 
  | 'federated'
  | 'models'
  | 'ml_studio'
  | 'transparency'
  | 'activity'
  | 'copilot';

// Backwards compatibility alias
export type AppleNavKey = MedicusNavKey;

interface Props {
  activeTab: MedicusNavKey;
  onTabChange: (tab: MedicusNavKey) => void;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenJudgeTour: () => void;
  unreadCount?: number;
  currentUser?: {
    username: string;
    role: string;
    full_name: string;
    phc_id?: string | null;
  } | null;
  onLogout?: () => void;
}

export const MedicusNavbar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  currentLang,
  onLanguageChange,
  currentRole,
  onRoleChange,
  onOpenSearch,
  onOpenNotifications,
  onOpenJudgeTour,
  unreadCount = 0,
  currentUser,
  onLogout,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const t = getTranslation(currentLang);

  const primaryNavItems: { key: MedicusNavKey; label: string; highlight?: boolean }[] = [
    { key: 'national', label: t.nav_overview },
    { key: 'phc', label: t.nav_phc },
    { key: 'medicines', label: t.nav_medicines },
    { key: 'risks', label: t.nav_risks },
    { key: 'redistribution', label: t.nav_redistribution },
    { key: 'capacity', label: t.nav_capacity },
    { key: 'emergency', label: t.nav_emergency },
    { key: 'federated', label: t.nav_federated },
    { key: 'ml_studio', label: t.nav_ml_studio },
    { key: 'copilot', label: t.nav_copilot, highlight: true },
  ];

  const secondaryNavItems: { key: MedicusNavKey; label: string }[] = [
    { key: 'state', label: t.nav_states },
    { key: 'district', label: t.nav_districts },
    { key: 'workforce', label: t.nav_workforce },
    { key: 'models', label: t.nav_models },
    { key: 'transparency', label: t.nav_transparency },
    { key: 'activity', label: t.nav_activity },
  ];

  const roleNames: Record<UserRole, string> = {
    national_admin: t.role_national,
    state_admin: t.role_state,
    district_admin: t.role_district,
    phc_operator: t.role_phc,
  };

  const isSecondaryActive = secondaryNavItems.some((item) => item.key === activeTab);

  return (
    <header className="sticky top-3 z-50 px-4 sm:px-6 max-w-7xl mx-auto w-full transition-all">
      <div className="bg-white/80 backdrop-blur-xl border border-black/6 rounded-full px-5 py-2.5 shadow-sm flex items-center justify-between gap-3">
        {/* Brand Left */}
        <div 
          onClick={() => onTabChange('national')}
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center text-white shadow-xs">
            <span className="font-bold text-sm tracking-tight">M</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold tracking-tight text-[#1D1D1F]">
              {t.app_name}
            </div>
            <div className="text-[10px] font-medium text-black/40 tracking-wide uppercase -mt-0.5">
              {t.app_subtitle}
            </div>
          </div>
        </div>

        {/* Center Flowing Pill Navigation */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-none px-2 py-0.5">
          {primaryNavItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onTabChange(item.key);
                  setMoreMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : item.highlight
                    ? 'text-[#5856D6] hover:bg-[#5856D6]/10 flex items-center gap-1 font-bold'
                    : 'text-black/60 hover:text-black hover:bg-black/5'
                }`}
              >
                {item.highlight && <Sparkles className="w-3 h-3 text-[#5856D6]" />}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* More Navigation Dropdown for Regional Hierarchy & Deep Operations */}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                isSecondaryActive
                  ? 'bg-black/10 text-black font-bold'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
              title="More operational tools"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-black/6 p-1.5 text-xs z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-black/40 uppercase tracking-wider">
                  Regional & Deep Tools
                </div>
                {secondaryNavItems.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onTabChange(item.key);
                        setMoreMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                        isActive ? 'bg-[#007AFF]/10 text-[#007AFF] font-bold' : 'text-black/70 hover:bg-black/5'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#007AFF]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right Utility Pills */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-full hover:bg-black/5 text-black/60 transition-colors"
            title="Search facilities, medicines, districts (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full hover:bg-black/5 text-black/60 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF3B30] ring-2 ring-white" />
            )}
          </button>

          {/* Role Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#EAEAEA] text-xs font-semibold text-black/70 transition-colors"
            >
              <span>{roleNames[currentRole] || t.role_national}</span>
              <ChevronDown className="w-3 h-3 text-black/40" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-black/6 p-1.5 text-xs z-50">
                {(['national_admin', 'state_admin', 'district_admin', 'phc_operator'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onRoleChange(r);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                      currentRole === r ? 'bg-[#007AFF]/10 text-[#007AFF] font-bold' : 'text-black/70 hover:bg-black/5'
                    }`}
                  >
                    <span>{roleNames[r]}</span>
                    {currentRole === r && <CheckCircle2 className="w-3.5 h-3.5 text-[#007AFF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multilingual Selector (EN, HI, MR) */}
          <div className="flex items-center gap-0.5 bg-[#F5F5F7] p-0.5 rounded-full text-xs">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                currentLang === 'en' ? 'bg-white text-black shadow-xs' : 'text-black/50'
              }`}
              title="English"
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                currentLang === 'hi' ? 'bg-white text-black shadow-xs' : 'text-black/50'
              }`}
              title="हिन्दी (Hindi)"
            >
              हिं
            </button>
            <button
              onClick={() => onLanguageChange('mr')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                currentLang === 'mr' ? 'bg-white text-black shadow-xs' : 'text-black/50'
              }`}
              title="मराठी (Marathi)"
            >
              म
            </button>
          </div>

          {/* Judge Demo Tour Pill */}
          <button
            onClick={onOpenJudgeTour}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FF9500]/10 hover:bg-[#FF9500]/20 text-[#FF9500] text-xs font-bold transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.judge_tour}</span>
          </button>

          {/* User Profile & Sign Out */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-[11px] font-semibold text-gray-900 leading-tight">
                  {currentUser.full_name}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-purple-700 font-bold">
                  {currentUser.role === 'admin' ? 'National Admin' : 'PHC Operator'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:text-rose-600 bg-gray-100 hover:bg-rose-50 rounded-full transition cursor-pointer"
                title="Sign out of Medicus"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Re-export as AppleNavbar for backward compatibility
export const AppleNavbar = MedicusNavbar;
