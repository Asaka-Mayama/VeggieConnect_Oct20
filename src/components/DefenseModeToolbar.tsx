import React, { useState } from 'react';
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  User,
  Sprout,
  Truck,
  Shield,
  RotateCcw,
  ExternalLink,
  Check,
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface DefenseModeToolbarProps {
  currentUser: UserProfile | null;
  onSwitchPersona: (role: UserRole) => void;
  onResetDemoData: () => void;
  isAdminRoute?: boolean;
}

// The Reset button only shows when VITE_ENABLE_DEMO_RESET=true in .env (off for the real demo).
const DEMO_RESET_ENABLED = (import.meta as any).env?.VITE_ENABLE_DEMO_RESET === 'true';

export const DefenseModeToolbar: React.FC<DefenseModeToolbarProps> = ({
  currentUser,
  onSwitchPersona,
  onResetDemoData,
  isAdminRoute,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    if (window.confirm('Reset demo data to clean thesis presentation state? This will restore fresh sample harvests and orders.')) {
      onResetDemoData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  return (
    <aside
      aria-label="Capstone Defense Toolbar"
      className="fixed bottom-18 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg transition-all duration-300"
    >
      {/* Floating Defense Pill Trigger */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden">
        <header
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold cursor-pointer hover:bg-slate-800/80 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
              <GraduationCap className="w-4 h-4" />
            </span>
            <span className="font-display font-semibold tracking-wide">
              Thesis Defense Helper
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Active: {currentUser ? currentUser.role.toUpperCase() : 'LOGIN VIEW'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[10px] hidden sm:inline">
              {isOpen ? 'Collapse Tools' : 'Quick Role Switch'}
            </span>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </header>

        {/* Expanded Panel */}
        {isOpen && (
          <div className="p-4 pt-2 border-t border-slate-800 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Persona Switch Buttons */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Switch Role for Live Demonstration:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {/* Buyer */}
                <button
                  onClick={() => {
                    onSwitchPersona('buyer');
                    setIsOpen(false);
                  }}
                  className={`p-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    currentUser?.role === 'buyer'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <User className="w-3.5 h-3.5 flex-shrink-0 text-sky-400" />
                  <div className="truncate">
                    <div className="leading-tight">Buyer</div>
                    <div className="text-[9px] opacity-75 truncate">Maria Santos</div>
                  </div>
                </button>

                {/* Farmer */}
                <button
                  onClick={() => {
                    onSwitchPersona('farmer');
                    setIsOpen(false);
                  }}
                  className={`p-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    currentUser?.role === 'farmer'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                  <div className="truncate">
                    <div className="leading-tight">Farmer</div>
                    <div className="text-[9px] opacity-75 truncate">Tatay Ramon</div>
                  </div>
                </button>

                {/* Admin */}
                <button
                  onClick={() => {
                    onSwitchPersona('admin');
                    setIsOpen(false);
                  }}
                  className={`p-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    currentUser?.role === 'admin'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 flex-shrink-0 text-purple-400" />
                  <div className="truncate">
                    <div className="leading-tight">Admin Desk</div>
                    <div className="text-[9px] opacity-75 truncate">Supermarket Hub</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px]">
              {DEMO_RESET_ENABLED ? (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-semibold border border-red-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
                title="Reset sample produce and orders if you want a clean start"
              >
                {resetSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Data Reset ✓</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Demo Data</span>
                  </>
                )}
              </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <a
                  href="/admin"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                >
                  <span>Admin Desk</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <a
                  href="/"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                >
                  <span>Market App</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
