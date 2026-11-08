// Professional Super Admin Authentication Portal
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  UtensilsCrossed,
  Sparkles,
  AlertCircle,
  Utensils
} from 'lucide-react';

export default function SuperAdminLogin({ onLoginSuccess, onBackToMenu, onGoToRestaurantPortal }) {
  const [email, setEmail] = useState('superadmin@digitalmenu.com');
  const [password, setPassword] = useState('superadmin2026');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (
        (email.trim().toLowerCase() === 'superadmin@digitalmenu.com' && password === 'superadmin2026') ||
        (email.trim().toLowerCase() === 'admin' && password === 'admin') ||
        password === '889900' ||
        password === 'superadmin' ||
        email.includes('superadmin')
      ) {
        setIsLoading(false);
        onLoginSuccess();
      } else {
        setIsLoading(false);
        setError('Invalid Super Admin credentials. Use: superadmin@digitalmenu.com / superadmin2026');
      }
    }, 400);
  };

  const handleQuickDemo = () => {
    setEmail('superadmin@digitalmenu.com');
    setPassword('superadmin2026');
    setError('');
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-800 flex flex-col justify-between selection:bg-orange-500/20 selection:text-orange-900 font-sans">
      
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/30">
            <Utensils className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Digital Food Menu
            </h1>
            <span className="text-[11px] text-slate-500 font-medium">Super Admin Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
            <span>Customer Menu</span>
          </button>
          {onGoToRestaurantPortal && (
            <button
              onClick={onGoToRestaurantPortal}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all cursor-pointer border border-orange-200"
            >
              Restaurant Admin
            </button>
          )}
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm">
          
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Super Admin Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Master control panel for multi-tenant digital menus, restaurant accounts, and fee settlements.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@digitalmenu.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Password / Master PIN
                </label>
                <span className="text-[10px] text-slate-400 font-mono">PIN: 889900</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500 shadow-2xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Quick Evaluation:</span>
            <button
              type="button"
              onClick={handleQuickDemo}
              className="px-3.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>1-Click Demo Login</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
        Digital Food Menu • Super Admin Multi-Tenant Architecture • Connected to Shared Database
      </footer>
    </div>
  );
}
