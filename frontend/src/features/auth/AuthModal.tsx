import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { X, Mail, Lock, User as UserIcon, Sparkles } from 'lucide-react';
import { api } from '../../lib/api.js';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else if (tab === 'register') {
        await register(email, password, displayName || email.split('@')[0]);
      } else if (tab === 'forgot') {
        const res = await api.resetPassword(email);
        setInfo(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const gEmail = email.trim() || `google_user_${Date.now()}@gmail.com`;
      const gName = displayName.trim() || 'Google Adventurer';
      await loginWithGoogle(gEmail, gName);
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-brand-darkSurface border border-brand-darkBorder rounded-2xl shadow-glow-violet overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-brand-darkBorder bg-gradient-to-r from-violet-950/40 to-brand-darkSurface flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🎮</span> GAAI Account
            </h2>
            <p className="text-xs text-slate-400">Sign in to sync credits and unlock AI arcade rewards</p>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Welcome Grant Callout */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center gap-2.5 text-xs text-violet-200">
          <Sparkles className="w-4 h-4 text-brand-violet shrink-0" />
          <span>New players receive <strong>5 initial welcome credits</strong> instantly!</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brand-darkBorder mx-6 mt-4">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
              tab === 'login' ? 'border-brand-violet text-brand-violet' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
              tab === 'register' ? 'border-brand-violet text-brand-violet' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setTab('forgot'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
              tab === 'forgot' ? 'border-brand-violet text-brand-violet' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Reset
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {info && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
              {info}
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="NeonStriker"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-brand-darkPanel border border-brand-darkBorder rounded-xl text-white focus:outline-none focus:border-brand-violet transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                placeholder="player@gaai.app"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-brand-darkPanel border border-brand-darkBorder rounded-xl text-white focus:outline-none focus:border-brand-violet transition"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-brand-darkPanel border border-brand-darkBorder rounded-xl text-white focus:outline-none focus:border-brand-violet transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-glow-violet transition transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In to GAAI' : tab === 'register' ? 'Register & Claim 5 Credits' : 'Send Reset Link'}
          </button>

          {/* Google OAuth Alternative */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-darkBorder"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-brand-darkSurface px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-brand-darkBorder text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
};
