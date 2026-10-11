import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useCredits } from '../hooks/useCredits.js';
import { useTheme } from '../hooks/useTheme.js';
import { useNavigate } from 'react-router-dom';
import { Coins, Sun, Moon, Gamepad2, User as UserIcon, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, openAuthModal } = useAuth();
  const { balances, openWalletModal } = useCredits();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-brand-darkBorder glass-panel sticky top-0 z-30 transition-colors">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 md:hidden transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={() => navigate('/')}
          className="flex items-center space-x-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-500 flex items-center justify-center text-white shadow-glow-violet group-hover:scale-105 transition transform">
            <span className="font-extrabold text-base tracking-tighter font-mono">G</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 font-mono">
                GAAI
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                PROD
              </span>
            </div>
            <div className="text-[9px] text-slate-400 hidden sm:block font-medium">Gaming AI — Artificial Intelligence</div>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2.5">
        {/* Credits Badge */}
        <button
          onClick={openWalletModal}
          className="px-3 py-1.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center gap-2 shadow-sm transition transform active:scale-95 group"
          title="View Credit Wallet & 500-Line Limit status"
        >
          <div className="w-5 h-5 rounded-full bg-violet-500/20 text-brand-violet flex items-center justify-center group-hover:rotate-12 transition">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono font-bold text-white text-sm">{balances?.total ?? 0}</span>
          <span className="text-[11px] text-violet-300 hidden sm:inline">Credits</span>
        </button>

        {/* Arcade Shortcut */}
        <button
          onClick={() => navigate('/arcade')}
          className="hidden md:flex px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 text-xs font-semibold items-center gap-1.5 transition transform active:scale-95"
          title="Play 6 Arcade Games to Earn Credits"
        >
          <Gamepad2 className="w-4 h-4 text-cyan-400" />
          <span>Arcade</span>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">+1 Win</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-brand-darkBorder transition"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-400" />}
        </button>

        {/* User Account Button */}
        {user ? (
          <button
            onClick={openWalletModal}
            className="flex items-center space-x-2 p-1.5 pl-2 rounded-xl bg-white/5 hover:bg-white/10 border border-brand-darkBorder text-slate-200 text-xs font-medium transition"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-600 flex items-center justify-center text-white text-[11px] font-bold">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[100px] truncate hidden sm:inline">{user.display_name}</span>
          </button>
        ) : (
          <button
            onClick={openAuthModal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-semibold shadow-glow-violet hover:opacity-90 transition flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
