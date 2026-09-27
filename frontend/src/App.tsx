import React, { useState, useEffect } from 'react';
import { MedicusNavbar, MedicusNavKey } from './components/MedicusNavbar';
import { DetailDrawers } from './components/DetailDrawers';
import { SpotlightSearchModal } from './components/SpotlightSearchModal';
import { JudgeModeModal } from './components/JudgeModeModal';
import { GooglePhcMap } from './components/GooglePhcMap';
import { Language, getTranslation } from './i18n/translations';
import { UserRole, DrawerState, NotificationItem, TransferRow } from './types';
import { api } from './services/api';
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

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

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
