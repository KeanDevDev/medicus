import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Building2, 
  ArrowRight, 
  Lock, 
  User,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import medicusLogo from '../assets/medi.png';

export const LoginView: React.FC = () => {
  const { login, loginWithPreset } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username/PHC ID and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = async (u: string, p: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithPreset({ username: u, password: p });
    } catch (err: any) {
      setError(err.message || 'Preset authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col justify-between p-4 sm:p-8 selection:bg-blue-100">
      {/* Top Bar Branding */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <img src={medicusLogo} alt="frontend logo" className="w-16 h-16 object-contain object-left" />
          <div className="text-left">
            <div className="text-2xl font-black tracking-tight text-[#1D1D1F]">frontend</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full border border-gray-200/80 text-xs text-gray-600 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>National Grid Active • 208 Facilities</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Direct Authentication */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-200/70 flex flex-col">
          <div className="mb-6">
            <span className="inline-block text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#0071E3] rounded-full uppercase tracking-wider mb-2">
              Authentication Portal
            </span>
            <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Sign in to frontend</h2>
            <p className="text-sm text-gray-500 mt-1">
              Access national oversight or your facility's operational command center.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Username or Facility ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or SIM-PHC-KA-BEL-001"
                  className="w-full pl-11 pr-4 py-3 bg-[#FBFBFD] border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition text-[#1D1D1F] placeholder:text-gray-400"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-[#FBFBFD] border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition text-[#1D1D1F] placeholder:text-gray-400"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.99] text-white font-medium rounded-2xl transition duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Role-Based Access Control
            </span>
            <span>v2.0.0 Production</span>
          </div>
        </div>

        {/* Right: Quick Demo Presets for Evaluators */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-white/70 backdrop-blur rounded-3xl p-6 border border-gray-200/60 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#0071E3]" />
                  Instant Evaluator Presets
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select a pre-configured role to immediately experience frontend.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-[#0071E3] rounded-md">
                1-Click
              </span>
            </div>

            {/* Presets List */}
            <div className="space-y-3">
              {/* Preset 1: Admin */}
              <button
                type="button"
                onClick={() => handlePreset('admin', 'admin123')}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border border-gray-200/80 hover:border-blue-300 transition group flex items-center justify-between shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    AD
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition">
                        National Admin
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded font-medium border border-purple-200">
                        Admin Role
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      National overview, ML Studio, Model Ops, all 208 PHCs & Simulator
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition" />
              </button>

              {/* Preset 2: Belagavi PHC */}
              <button
                type="button"
                onClick={() => handlePreset('SIM-PHC-KA-BEL-001', 'phc123')}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-emerald-50/50 border border-gray-200/80 hover:border-emerald-300 transition group flex items-center justify-between shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1D1D1F] group-hover:text-emerald-700 transition">
                        Belagavi Sector-1 PHC
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-medium border border-emerald-200">
                        PHC Role
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Karnataka • Scoped data entry, lateral redistribution, local audit trail
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </button>

              {/* Preset 3: Pune PHC */}
              <button
                type="button"
                onClick={() => handlePreset('SIM-PHC-MH-PUN-001', 'phc123')}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border border-gray-200/80 hover:border-blue-300 transition group flex items-center justify-between shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1D1D1F] group-hover:text-blue-700 transition">
                        Pune Sector-1 PHC
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-medium border border-blue-200">
                        PHC Role
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Maharashtra • High patient volume, bed management & inventory log
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </button>

              {/* Preset 4: Varanasi PHC */}
              <button
                type="button"
                onClick={() => handlePreset('SIM-PHC-UP-VAR-001', 'phc123')}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-amber-50/50 border border-gray-200/80 hover:border-amber-300 transition group flex items-center justify-between shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1D1D1F] group-hover:text-amber-700 transition">
                        Varanasi Sector-1 PHC
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded font-medium border border-amber-200">
                        PHC Role
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Uttar Pradesh • Flood surveillance district, emergency transfer requests
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          {/* Privacy & Governance Guarantee */}
          <div className="p-4 bg-white/50 rounded-2xl border border-gray-200/50 text-xs text-gray-500 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#0071E3]" />
              Data Isolation & Governance Guarantee
            </div>
            <p>
              PHC operators are strictly restricted by backend cryptographic tokens to their own facility’s records. 
              Attempts to access cross-district or unauthorized PHC records return <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">HTTP 403 Forbidden</code>.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center py-4 text-xs text-gray-400">
        MEDICUS • National Health Mission & Ayushman Bharat Digital Mission Compatible • Verified RHS 2022-23 Topology
      </footer>
    </div>
  );
};
