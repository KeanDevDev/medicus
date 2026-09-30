import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Bell, Sparkles, HelpCircle, 
  ChevronDown, CheckCircle2,
  ChevronLeft, ChevronRight, Menu, X, LogOut
} from 'lucide-react';
import { Language, getTranslation } from '../i18n/translations';
import { UserRole } from '../types';
import medicusLogo from '../assets/medi.png';

export type MedicusNavKey = 
  | 'national' 
  | 'map'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = getTranslation(currentLang);

  // Desktop navigation ref & scroll states
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

  // Mobile navigation ref & scroll states
  const navRefMobile = useRef<HTMLElement>(null);
  const [canScrollLeftMobile, setCanScrollLeftMobile] = useState(false);
  const [canScrollRightMobile, setCanScrollRightMobile] = useState(false);

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const checkScrollMobile = () => {
    if (navRefMobile.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRefMobile.current;
      setCanScrollLeftMobile(scrollLeft > 6);
      setCanScrollRightMobile(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const scrollByAmount = (amount: number) => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScroll, 250);
    }
  };

  const scrollByAmountMobile = (amount: number) => {
    if (navRefMobile.current) {
      navRefMobile.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScrollMobile, 250);
    }
  };

  const primaryNavItems: { key: MedicusNavKey; label: string; highlight?: boolean }[] = [
    { key: 'national', label: t.nav_overview },
    { key: 'map', label: 'PHC Map' },
    { key: 'phc', label: t.nav_phc },
    { key: 'medicines', label: t.nav_medicines },
    { key: 'risks', label: t.nav_risks },
    { key: 'redistribution', label: t.nav_redistribution },
    { key: 'capacity', label: t.nav_capacity },
    { key: 'emergency', label: t.nav_emergency },
    { key: 'ml_studio', label: t.nav_ml_studio },
    { key: 'copilot', label: t.nav_copilot },
  ];

  const secondaryNavItems: { key: MedicusNavKey; label: string; highlight?: boolean }[] = [
    { key: 'state', label: t.nav_states },
    { key: 'district', label: t.nav_districts },
    { key: 'workforce', label: t.nav_workforce },
    { key: 'models', label: t.nav_models },
    { key: 'transparency', label: t.nav_transparency },
    { key: 'activity', label: t.nav_activity },
  ];

  useEffect(() => {
    checkScroll();
    checkScrollMobile();
    const handleResize = () => {
      checkScroll();
      checkScrollMobile();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-center active pills on tab change
  useEffect(() => {
    if (navRef.current) {
      const activeBtn = navRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      setTimeout(checkScroll, 300);
    }
    if (navRefMobile.current) {
      const activeBtnMobile = navRefMobile.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtnMobile) {
        activeBtnMobile.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      setTimeout(checkScrollMobile, 300);
    }
  }, [activeTab]);

  // Drag-to-scroll mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!navRef.current) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX - navRef.current.offsetLeft;
    scrollLeftRef.current = navRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !navRef.current) return;
    const x = e.pageX - navRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.4;
    dragDistanceRef.current = Math.abs(walk);
    navRef.current.scrollLeft = scrollLeftRef.current - walk;
    checkScroll();
  };

  return (
    <header className="sticky top-2 sm:top-3 z-50 px-3 sm:px-6 max-w-7xl mx-auto w-full transition-all">
      <div className="bg-white/90 backdrop-blur-xl border border-black/6 rounded-2xl md:rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 shadow-sm transition-all">
        {/* Main Row: Brand, Desktop Center Nav, Utilities / Mobile Toggle */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand Left */}
          <div 
            onClick={() => onTabChange('national')}
            className="flex items-center cursor-pointer flex-shrink-0 select-none"
          >
            <img src={medicusLogo} alt="Medicus logo" className="w-24 h-14 object-contain object-left" />
          </div>

          {/* Desktop Center Flowing Pill Navigation (Hidden on mobile < md) */}
          <div className="hidden md:flex relative items-center min-w-0 flex-1 justify-center max-w-xl xl:max-w-2xl px-1">
            {/* Desktop Left Arrow Button */}
            {canScrollLeft && (
              <button
                onClick={() => scrollByAmount(-180)}
                aria-label="Scroll options left"
                title="Scroll options left"
                className="absolute left-0 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-black/75 hover:text-black shadow-md border border-black/10 flex items-center justify-center transition-all cursor-pointer -translate-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}

            {/* Desktop Left Subtle Fade Mask */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10 rounded-l-full" />
            )}

            {/* Flowing Pills Nav */}
            <nav 
              ref={navRef}
              onScroll={checkScroll}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className="flex items-center gap-1 overflow-x-auto scrollbar-none px-3 py-0.5 w-full select-none cursor-grab active:cursor-grabbing scroll-smooth"
            >
              {primaryNavItems.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    data-active={isActive}
                    onClick={(e) => {
                      if (dragDistanceRef.current > 5) {
                        e.preventDefault();
                        return;
                      }
                      onTabChange(item.key);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
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

            </nav>

            {/* Desktop Right Subtle Fade Mask */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 rounded-r-full" />
            )}

            {/* Desktop Right Arrow Button */}
            {canScrollRight && (
              <button
                onClick={() => scrollByAmount(180)}
                aria-label="Scroll options right"
                title="Scroll options right"
                className="absolute right-0 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-black/75 hover:text-black shadow-md border border-black/10 flex items-center justify-center transition-all cursor-pointer translate-x-1"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Right Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 text-black/60 transition-colors cursor-pointer"
              title="Search facilities, medicines, districts (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-black/5 text-black/60 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 rounded-full bg-[#FF3B30] ring-2 ring-white" />
              )}
            </button>

            {/* Multilingual Selector (EN, HI, MR) */}
            <div className="flex items-center gap-0.5 bg-[#F5F5F7] p-0.5 rounded-full text-xs">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all ${
                  currentLang === 'en' ? 'bg-white text-black shadow-xs' : 'text-black/50'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('hi')}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all ${
                  currentLang === 'hi' ? 'bg-white text-black shadow-xs' : 'text-black/50'
                }`}
                title="हिन्दी (Hindi)"
              >
                हिं
              </button>
              <button
                onClick={() => onLanguageChange('mr')}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all ${
                  currentLang === 'mr' ? 'bg-white text-black shadow-xs' : 'text-black/50'
                }`}
                title="मराठी (Marathi)"
              >
                म
              </button>
            </div>

            {/* Judge Demo Tour Pill (Hidden on small screens) */}
            <button
              onClick={onOpenJudgeTour}
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FF9500]/10 hover:bg-[#FF9500]/20 text-[#FF9500] text-xs font-bold transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t.judge_tour}</span>
            </button>

            {/* User Profile & Sign Out (Desktop only) */}
            {currentUser && (
              <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="flex flex-col text-right">
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

            {/* Mobile Menu Hamburger Button (Visible on mobile only < md) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-full hover:bg-black/5 text-black/70 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-black" /> : <Menu className="w-5 h-5 text-black" />}
            </button>
          </div>
        </div>

        {/* Row 2: Full-Width Mobile Navigation Pill Rail (Visible on mobile only < md) */}
        <div className="md:hidden relative flex items-center mt-2 pt-2 border-t border-black/5 w-full">
          {/* Mobile Left Arrow */}
          {canScrollLeftMobile && (
            <button
              onClick={() => scrollByAmountMobile(-140)}
              aria-label="Scroll left"
              className="absolute left-0 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-black/80 shadow-md border border-black/10 flex items-center justify-center transition-all cursor-pointer -translate-x-0.5"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}

          {/* Mobile Left Fade */}
          {canScrollLeftMobile && (
            <div className="absolute left-0 top-0 bottom-0 w-7 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
          )}

          {/* Horizontal Nav on Mobile */}
          <nav
            ref={navRefMobile}
            onScroll={checkScrollMobile}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none px-2 py-0.5 w-full select-none scroll-smooth touch-pan-x"
          >
            {primaryNavItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  data-active={isActive}
                  onClick={() => {
                    onTabChange(item.key);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : item.highlight
                      ? 'text-[#5856D6] bg-[#5856D6]/8 font-bold'
                      : 'text-black/60 hover:text-black bg-black/4'
                  }`}
                >
                  {item.highlight && <Sparkles className="w-3 h-3 text-[#5856D6] inline mr-1" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Right Fade */}
          {canScrollRightMobile && (
            <div className="absolute right-0 top-0 bottom-0 w-7 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
          )}

          {/* Mobile Right Arrow */}
          {canScrollRightMobile && (
            <button
              onClick={() => scrollByAmountMobile(140)}
              aria-label="Scroll right"
              className="absolute right-0 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-black/80 shadow-md border border-black/10 flex items-center justify-center transition-all cursor-pointer translate-x-0.5"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Mobile Dropdown Sheet (When hamburger menu is open) */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-black/6 flex flex-col space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User profile card on mobile */}
            {currentUser && (
              <div className="bg-[#F5F5F7] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1D1D1F]">{currentUser.full_name}</div>
                  <div className="text-[10px] text-[#007AFF] font-semibold uppercase tracking-wider">
                    {currentUser.role === 'admin' ? 'National Admin' : 'PHC Operator'}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* All Nav Items (Primary + Secondary) in full-width touch friendly tiles */}
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              <div className="text-[10px] font-bold text-black/40 uppercase tracking-wider px-2 py-1">
                All Modules & Operations
              </div>
              {[...primaryNavItems, ...secondaryNavItems].map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onTabChange(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-[#007AFF] text-white shadow-xs'
                        : 'text-black/70 hover:bg-black/5 hover:text-black'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {item.highlight && <Sparkles className="w-3.5 h-3.5" />}
                      <span>{item.label}</span>
                    </span>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>

            {/* Judge Tour button on mobile */}
            <button
              onClick={() => {
                onOpenJudgeTour();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FF9500]/10 text-[#FF9500] text-xs font-bold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t.judge_tour}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

// Re-export as AppleNavbar for backward compatibility
export const AppleNavbar = MedicusNavbar;

