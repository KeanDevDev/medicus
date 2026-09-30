import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MedicusNavbar, MedicusNavKey } from './components/MedicusNavbar';
import { DetailDrawers } from './components/DetailDrawers';
import { SpotlightSearchModal } from './components/SpotlightSearchModal';
import { JudgeModeModal } from './components/JudgeModeModal';
import { GooglePhcMap } from './components/GooglePhcMap';
import { Language, getTranslation } from './i18n/translations';
import { UserRole, DrawerState, NotificationItem, TransferRow } from './types';
import { api } from './services/api';
import { realtime } from './services/realtime';
import { AuthProvider, useAuth } from './context/AuthContext';

// Views
import { LoginView } from './views/LoginView';
import { PhcPortalView } from './views/PhcPortalView';
import { AdminMlStudioView } from './views/AdminMlStudioView';
import { NationalOverview } from './views/NationalOverview';
import { StateView } from './views/StateView';
import { DistrictView } from './views/DistrictView';
import { PhcDetailView } from './views/PhcDetailView';
import { MedicineControlTower } from './views/MedicineControlTower';
import { BedsOperationsView } from './views/BedsOperationsView';
import { WorkforceOperationsView } from './views/WorkforceOperationsView';
import { StockoutRiskMatrixView } from './views/StockoutRiskMatrixView';
import { RecommendationsView } from './views/RecommendationsView';
import { EmergencySimulatorView } from './views/EmergencySimulatorView';
import { FederatedView } from './views/FederatedView';
import { ModelPerformanceView } from './views/ModelPerformanceView';
import { TransparencyView } from './views/TransparencyView';
import { ActivityLogView } from './views/ActivityLogView';
import { CopilotView } from './views/CopilotView';

function MedicusAppContent() {
  const { user, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<MedicusNavKey>('national');
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [currentRole, setCurrentRole] = useState<UserRole>('national_admin');

  // Hierarchy navigation
  const [selectedStateId, setSelectedStateId] = useState<string>('MH');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('MH_PUN');
  const [selectedPhcId, setSelectedPhcId] = useState<string>('SIM-PHC-MH-PUN-001');

  // Modals & Drawers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isJudgeTourOpen, setIsJudgeTourOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    type: null,
    data: undefined,
  });

  // Telemetry notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveToast, setLiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    type?: string;
  } | null>(null);

  const t = getTranslation(currentLang);

  // Keyboard shortcut Cmd+K or Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadNotifications = async () => {
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Real-time Telemetry Zero-Latency Sync across all tabs and clients
  useEffect(() => {
    realtime.connect();

    const unsubscribe = realtime.subscribe((event) => {
      // Trigger full reactive reload of dashboard tabs and state
      handleRefresh();

      let title = 'Network Update';
      let message = event.summary || 'Operational update received.';

      if (event.type === 'DATA_UPDATED') {
        if (event.event === 'INVENTORY_UPDATED') {
          title = '⚡ PHC Inventory Recalibrated';
          message = event.summary || `Stock updated for ${event.medicine_name || event.medicine_id} at ${event.phc_name || event.phc_id}. Days of stock and stockout risks recomputed network-wide.`;
        } else if (event.event === 'DEMAND_UPDATED') {
          title = '📈 Clinical Intake Surge';
          message = event.summary || `OPD/IPD volume updated at ${event.phc_id}. Dynamic safety stock recomputed.`;
        } else if (event.event === 'BEDS_UPDATED') {
          title = '🛏️ Bed Capacity Shift';
          message = event.summary || `Bed occupancy updated at ${event.phc_id}.`;
        } else if (event.event === 'STAFF_UPDATED') {
          title = '👨‍⚕️ Workforce Status';
          message = event.summary || `Staff attendance updated at ${event.phc_id}.`;
        } else if (event.event?.startsWith('TRANSFER_')) {
          title = '📦 Inter-PHC Redistribution';
          message = event.summary || `Lateral supply transfer status updated.`;
        }
      } else if (event.type === 'SIMULATION_COMPLETED') {
        title = '🚨 Emergency Stress Simulation';
        message = event.summary || `Crisis scenario executed across target facilities.`;
      } else if (event.type === 'SIMULATION_RESET') {
        title = '🔄 Network Reset to Baseline';
        message = 'Operational baselines restored across all 208 PHCs.';
      }

      const toastId = String(Date.now());
      setLiveToast({
        id: toastId,
        title,
        message,
        type: event.type
      });

      // Auto-dismiss after 4.5 seconds
      setTimeout(() => {
        setLiveToast((curr) => (curr && curr.id === toastId ? null : curr));
      }, 4500);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, refreshKey]);

  const handleSelectState = (stateId: string) => {
    setSelectedStateId(stateId);
    setActiveTab('state');
  };

  const handleSelectDistrict = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setActiveTab('district');
  };

  const handleSelectPhc = (phcId: string) => {
    setSelectedPhcId(phcId);
    setActiveTab('phc');
  };

  const handleNavigateToEntity = (type: 'phc' | 'district' | 'state' | 'medicine' | 'risk', id: string) => {
    if (type === 'phc') {
      setSelectedPhcId(id);
      setActiveTab('phc');
    } else if (type === 'district') {
      setSelectedDistrictId(id);
      setActiveTab('district');
    } else if (type === 'state') {
      setSelectedStateId(id);
      setActiveTab('state');
    } else if (type === 'medicine') {
      setDrawer({
        isOpen: true,
        type: 'medicine',
        data: { generic_name: id, medicine_id: id },
      });
    } else if (type === 'risk') {
      setDrawer({
        isOpen: true,
        type: 'risk',
        data: { risk_id: id, generic_name: 'Identified Risk', phc_id: selectedPhcId },
      });
    }
  };

  const openMedicineDrawer = (med: any) => {
    setDrawer({ isOpen: true, type: 'medicine', data: med });
  };

  const openRiskDrawer = (risk: any) => {
    setDrawer({ isOpen: true, type: 'risk', data: risk });
  };

  const openTransferDrawer = (tr: TransferRow) => {
    setDrawer({ isOpen: true, type: 'transfer', data: tr });
  };

  // 1. Initial authentication loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-blue-500/30 border-t-[#0071E3] rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-semibold text-[#1D1D1F]">Initializing MEDICUS Session...</h2>
        <p className="text-xs text-gray-400 mt-1">Verifying cryptographic credentials & RBAC clearance</p>
      </div>
    );
  }

  // 2. Unauthenticated state -> render Login View
  if (!user) {
    return <LoginView />;
  }

  // 3. Authenticated as PHC Operator -> route to dedicated PHC Portal
  if (user.role === 'phc_operator') {
    return <PhcPortalView />;
  }

  // 4. Authenticated as Admin -> render Full National Command Center with ML Studio
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-[#007AFF] selection:text-white">
      {/* Floating Top Navigation Rail */}
      <MedicusNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setDrawer({ isOpen: true, type: 'notifications' })}
        onOpenJudgeTour={() => setIsJudgeTourOpen(true)}
        unreadCount={notifications.length}
        currentUser={user}
        onLogout={logout}
      />

      {/* Main Canvas Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div key={refreshKey}>
          {activeTab === 'national' && (
            <NationalOverview
              onSelectState={handleSelectState}
              onNavigateTab={setActiveTab}
              onOpenTransferDrawer={openTransferDrawer}
              onSelectPhc={handleSelectPhc}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'map' && (
            <div className="space-y-6">
              <div className="pt-2">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight">
                  PHC Geospatial Explorer
                </h1>
                <p className="text-sm text-black/60 mt-1 font-medium">
                  Real-time Google Maps telemetry and supply risk tracking across all 208 primary health centres
                </p>
              </div>

              <GooglePhcMap
                onSelectPhc={handleSelectPhc}
                height="680px"
                title="National Primary Healthcare Network"
                subtitle="Live Google Maps view showing real-world coordinates, satellite terrain, bed capacities, and real-time inventory risk status"
                showFilters={true}
              />
            </div>
          )}

          {activeTab === 'state' && (
            <StateView
              selectedStateId={selectedStateId}
              onSelectState={setSelectedStateId}
              onSelectDistrict={handleSelectDistrict}
              onBackToNational={() => setActiveTab('national')}
            />
          )}

          {activeTab === 'district' && (
            <DistrictView
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={setSelectedDistrictId}
              onSelectPhc={handleSelectPhc}
              onBackToState={() => setActiveTab('state')}
            />
          )}

          {activeTab === 'phc' && (
            <PhcDetailView
              selectedPhcId={selectedPhcId}
              onBackToDistrict={() => setActiveTab('district')}
              onNavigateTab={setActiveTab}
              onOpenMedicineDrawer={openMedicineDrawer}
              onOpenRiskDrawer={openRiskDrawer}
            />
          )}

          {activeTab === 'medicines' && (
            <MedicineControlTower
              onSelectPhc={handleSelectPhc}
              onNavigateTab={setActiveTab}
              onOpenMedicineDrawer={openMedicineDrawer}
              onOpenRiskDrawer={openRiskDrawer}
            />
          )}

          {activeTab === 'capacity' && (
            <BedsOperationsView />
          )}

          {activeTab === 'workforce' && (
            <WorkforceOperationsView />
          )}

          {activeTab === 'risks' && (
            <StockoutRiskMatrixView
              onSelectPhc={handleSelectPhc}
              onOpenRiskDrawer={openRiskDrawer}
            />
          )}

          {activeTab === 'redistribution' && (
            <RecommendationsView
              onSelectPhc={handleSelectPhc}
              onOpenTransferDrawer={openTransferDrawer}
            />
          )}

          {activeTab === 'emergency' && (
            <EmergencySimulatorView
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'federated' && (
            <FederatedView />
          )}

          {activeTab === 'models' && (
            <ModelPerformanceView />
          )}

          {activeTab === 'ml_studio' && (
            <AdminMlStudioView />
          )}

          {activeTab === 'transparency' && (
            <TransparencyView />
          )}

          {activeTab === 'activity' && (
            <ActivityLogView />
          )}

          {activeTab === 'copilot' && (
            <CopilotView />
          )}
        </div>
      </main>

      {/* Floating Slide-over Drawers */}
      <DetailDrawers
        isOpen={drawer.isOpen}
        type={drawer.type}
        data={drawer.data}
        onClose={() => setDrawer({ isOpen: false, type: null })}
        onNavigateToEntity={handleNavigateToEntity}
        notifications={notifications}
        onTransferUpdated={handleRefresh}
      />

      {/* Spotlight Search Modal */}
      <SpotlightSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigateToEntity={handleNavigateToEntity}
      />

      {/* Evaluation Guided Tour Modal */}
      <JudgeModeModal
        isOpen={isJudgeTourOpen}
        onClose={() => setIsJudgeTourOpen(false)}
        onRefreshData={handleRefresh}
        onNavigateTab={(tab: string) => {
          setActiveTab(tab as MedicusNavKey);
          setIsJudgeTourOpen(false);
        }}
      />

      {/* Real-time Telemetry Live Floating Toast */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-black/10 flex items-start gap-3 select-none"
          >
            <div className="relative flex h-3 w-3 mt-1 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1D1D1F] tracking-tight">{liveToast.title}</h4>
                <button
                  onClick={() => setLiveToast(null)}
                  className="text-gray-400 hover:text-gray-700 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">{liveToast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal Footer */}
      <footer className="mt-auto border-t border-black/5 bg-[#F5F5F7] py-6 px-4 text-xs text-black/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1D1D1F]">{t.app_name}</span>
            <span>•</span>
            <span>{t.app_subtitle}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Google Vertex AI • HistGradientBoosting v1.0 • FedAvg v3.0</span>
            <span>•</span>
            <button
              onClick={() => setIsJudgeTourOpen(true)}
              className="text-[#007AFF] hover:underline font-semibold cursor-pointer"
            >
              {t.judge_tour}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MedicusAppContent />
    </AuthProvider>
  );
}

export default App;
