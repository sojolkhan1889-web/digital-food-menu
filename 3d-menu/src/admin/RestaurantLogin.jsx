import React, { useState } from 'react';
import { Utensils, Lock, User, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RestaurantLogin({ onLoginSuccess, onBackToMenu }) {
  const [loginId, setLoginId] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (loginId.trim() === 'admin' && password === 'admin123') {
        setIsLoading(false);
        onLoginSuccess();
      } else {
        setIsLoading(false);
        setError('Invalid Restaurant ID or Password. (Demo: admin / admin123)');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col justify-between text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 select-auto touch-auto overflow-y-auto">
      
      {/* Top Bar with Back to Customer Menu */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[5px] bg-orange-600 flex items-center justify-center text-white">
            <Utensils className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Digital Food Menu &bull; Restaurant Portal
          </span>
        </div>

        <button
          onClick={onBackToMenu}
          className="px-3.5 py-1.5 rounded-[5px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-600 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
          <span>Customer Menu</span>
        </button>
      </div>

      {/* Main Login Card - Sharp 0px corners, Solid */}
      <div className="w-full max-w-md mx-auto my-8 bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-800 rounded-[5px] p-6 sm:p-8 shadow-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-[5px] bg-orange-500/10 border border-orange-500/20 text-orange-600 mx-auto flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Restaurant Portal Login</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to manage foods, categories, orders, and live menu publishing.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[5px] bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
              Restaurant Login ID / Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter login ID"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors bg-white dark:bg-[#0B0F19] border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors bg-white dark:bg-[#0B0F19] border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-[5px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Demo Credentials:</span>
            <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">admin / admin123</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-all cursor-pointer shadow disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center text-xs text-slate-500 py-4">
        &copy; {new Date().getFullYear()} Universal Digital Food Menu Platform &bull; Cloud Protected
      </div>
    </div>
  );
}
