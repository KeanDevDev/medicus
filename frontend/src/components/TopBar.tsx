import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Search, Bell, Sparkles, HelpCircle, 
  RotateCcw, Zap, Globe, ChevronRight, User, AlertTriangle, Building, Pill
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { UserRole, SearchResult, NotificationItem } from '../types';
import { api } from '../services/api';

interface Props {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  breadcrumbs: { label: string; onClick?: () => void }[];
  onOpenNotifications: () => void;
  onOpenCopilot: () => void;
  onOpenJudgeTour: () => void;
  onRefreshData: () => void;
  onNavigateToEntity: (type: 'phc' | 'district' | 'state' | 'medicine' | 'risk', id: string) => void;
  unreadCount?: number;
}

export const TopBar: React.FC<Props> = ({
  currentLang,
  onLanguageChange,
  currentRole,
  onRoleChange,
  breadcrumbs,
  onOpenNotifications,
  onOpenCopilot,
  onOpenJudgeTour,
  onRefreshData,
  onNavigateToEntity,
  unreadCount = 0,
}) => {
  const t = translations[currentLang];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search(searchQuery);
        setSearchResults(res);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const roleLabels: Record<UserRole, string> = {
    national_admin: t.role_national,
    state_admin: t.role_state,
    district_admin: t.role_district,
    phc_operator: t.role_phc,
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      {/* Top Banner: Telemetry & Official Status */}
      <div className="bg-slate-950 px-4 py-1 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            OPERATIONAL TELEMETRY: ACTIVE
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">PILOT: 5 STATES (MH, KA, RJ, TN, UP) • 26 LGD DISTRICTS • 208 PHCs</span>
          <span className="text-slate-700 hidden lg:inline">|</span>
          <span className="text-amber-400/90 font-mono hidden lg:inline">DUAL-SCALE GROUND TRUTH: 130K+ NATIONAL REF</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <span className="font-mono text-slate-400">HistGradientBoosting + FedAvg v3.0</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400 truncate max-w-sm">{t.disclaimer}</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand + Breadcrumbs */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">{t.app_title}</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                  SaaS
                </span>
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-hidden">
            <span className="text-slate-600">/</span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />}
                {crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className="hover:text-emerald-400 hover:underline transition-colors truncate max-w-[140px]"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-slate-200 font-semibold truncate max-w-[180px]">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Center: Global Omnisearch with dropdown */}
        <div ref={searchRef} className="relative flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults) setShowSearchDropdown(true);
              }}
              placeholder="Search PHCs, Districts, Medicines, Alerts... (Ctrl+K)"
              className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
              /
            </kbd>
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && searchResults && (
            <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto divide-y divide-slate-800/80">
              {searchResults.phcs.length === 0 &&
               searchResults.districts.length === 0 &&
               searchResults.medicines.length === 0 &&
               searchResults.alerts.length === 0 && (
                <div className="p-4 text-xs text-slate-400 text-center">
                  No matching facilities, medicines, or alerts found for "{searchQuery}".
                </div>
              )}

              {/* PHCs */}
              {searchResults.phcs.length > 0 && (
                <div className="p-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-emerald-400" />
                    <span>Primary Health Centres ({searchResults.phcs.length})</span>
                  </div>
                  {searchResults.phcs.map((phc) => (
                    <div
                      key={phc.phc_id}
                      onClick={() => {
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                        onNavigateToEntity('phc', phc.phc_id);
                      }}
                      className="px-2.5 py-1.5 hover:bg-slate-800 rounded cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{phc.phc_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{phc.phc_id} • {phc.district_name}, {phc.state_name}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                        {phc.facility_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Medicines */}
              {searchResults.medicines.length > 0 && (
                <div className="p-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                    <Pill className="w-3 h-3 text-cyan-400" />
                    <span>Essential Medicines ({searchResults.medicines.length})</span>
                  </div>
                  {searchResults.medicines.map((med) => (
                    <div
                      key={med.medicine_id}
                      onClick={() => {
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                        onNavigateToEntity('medicine', med.medicine_id);
                      }}
                      className="px-2.5 py-1.5 hover:bg-slate-800 rounded cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{med.generic_name}</div>
                        <div className="text-[11px] text-slate-500">{med.dosage_form} • {med.category}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded font-mono">
                        {med.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Alerts */}
              {searchResults.alerts.length > 0 && (
                <div className="p-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Stock-out Alerts ({searchResults.alerts.length})</span>
                  </div>
                  {searchResults.alerts.map((alert) => (
                    <div
                      key={alert.risk_id}
                      onClick={() => {
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                        onNavigateToEntity('risk', alert.risk_id);
                      }}
                      className="px-2.5 py-1.5 hover:bg-slate-800 rounded cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-rose-300">{alert.generic_name} at {alert.phc_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{alert.days_of_stock} days stock remaining</div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions, Role Switcher, Copilot, Notifs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Ask AI Copilot Button */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold shadow-sm transition-all"
            title="Open Grounded Gemini Operations Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="hidden sm:inline">Ask Copilot</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Operational Notifications & Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
            )}
          </button>

          {/* Role Switcher */}
          <div className="relative">
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="text-xs bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
              title="Switch Operational Role Perspective"
            >
              <option value="national_admin">National Mission Director</option>
              <option value="state_admin">State Health Admin</option>
              <option value="district_admin">District Health Officer</option>
              <option value="phc_operator">PHC Medical Officer</option>
            </select>
          </div>

          {/* Quick Demo Controls */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={onOpenJudgeTour}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/70 hover:bg-amber-900 transition-colors"
              title="Open 30-Second Judge Tour"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Tour</span>
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Reset state to Normal baseline"
            >
              <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSeedMonsoon}
              disabled={isSeeding}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-cyan-300 hover:bg-cyan-950/50 transition-colors"
              title="Simulate Monsoon Surge"
            >
              <Zap className={`w-3 h-3 text-cyan-400 ${isSeeding ? 'animate-bounce' : ''}`} />
              <span>Monsoon</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-1.5 py-1 rounded text-xs font-medium ${
                currentLang === 'en' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-1.5 py-1 rounded text-xs font-medium ${
                currentLang === 'hi' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              हिं
            </button>
            <button
              onClick={() => onLanguageChange('mr')}
              className={`px-1.5 py-1 rounded text-xs font-medium ${
                currentLang === 'mr' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              म
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
