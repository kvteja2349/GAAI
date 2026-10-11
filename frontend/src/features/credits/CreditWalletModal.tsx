import React, { useState } from 'react';
import { useCredits } from '../../hooks/useCredits.js';
import { useNavigate } from 'react-router-dom';
import { Coins, Sparkles, Trophy, Calendar, Clock, X, ArrowUpRight, ArrowDownRight, RefreshCw, Gamepad2 } from 'lucide-react';

export const CreditWalletModal: React.FC = () => {
  const {
    balances,
    walletData,
    isWalletModalOpen,
    closeWalletModal,
    claimDailyCredits,
    timeUntilReset,
    isLoading
  } = useCredits();

  const navigate = useNavigate();
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  if (!isWalletModalOpen) return null;

  const handleClaim = async () => {
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await claimDailyCredits();
      setClaimMsg(res.message);
    } catch (e: any) {
      setClaimMsg(e.message || 'Error claiming daily credits');
    } finally {
      setClaiming(false);
    }
  };

  const handleOpenArcade = () => {
    closeWalletModal();
    navigate('/arcade');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-brand-darkSurface border border-brand-darkBorder rounded-2xl shadow-glow-violet overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-darkBorder bg-gradient-to-r from-violet-950/40 via-brand-darkSurface to-cyan-950/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 text-brand-violet border border-violet-500/30">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                GAAI Credit Wallet
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono border border-violet-500/30">
                  500 Lines / Credit
                </span>
              </h2>
              <p className="text-xs text-slate-400">Verified server-side balance & transaction ledger</p>
            </div>
          </div>
          <button
            onClick={closeWalletModal}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Spendable Total Hero Card */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-900/40 via-brand-darkPanel to-cyan-900/30 border border-violet-500/30 shadow-glass">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-violet-300">Total Spendable Balance</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 font-mono">
                    {balances?.total ?? 0}
                  </span>
                  <span className="text-slate-400 text-sm font-medium">credits available</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Authorizes up to <strong className="text-slate-200">{((balances?.total ?? 0) * 500).toLocaleString()} output lines</strong> across AI models.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={handleOpenArcade}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-glow-violet transition transform active:scale-95"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Earn Credits in Arcade
                </button>
              </div>
            </div>
          </div>

          {/* Sub-balances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Welcome credits */}
            <div className="p-4 rounded-xl bg-brand-darkPanel border border-brand-darkBorder/60">
              <div className="flex items-center space-x-2 text-violet-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Welcome Balance</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {balances?.welcome ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Initial 5 grant on signup</div>
            </div>

            {/* Daily credits */}
            <div className="p-4 rounded-xl bg-brand-darkPanel border border-brand-darkBorder/60">
              <div className="flex items-center space-x-2 text-cyan-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Daily Balance</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {balances?.daily ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">5 fresh credits daily</div>
            </div>

            {/* Game-earned credits */}
            <div className="p-4 rounded-xl bg-brand-darkPanel border border-brand-darkBorder/60">
              <div className="flex items-center space-x-2 text-amber-400 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Game Rewards</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {balances?.game ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">+1 per verified win</div>
            </div>
          </div>

          {/* Daily Reset Timer & Manual Claim Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200 gap-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Next Daily Reset (Asia/Kolkata): <strong className="font-mono text-white">{timeUntilReset}</strong></span>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 font-medium transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${claiming ? 'animate-spin' : ''}`} />
              Check Daily Grant
            </button>
          </div>

          {claimMsg && (
            <div className="p-3 rounded-lg bg-violet-900/40 border border-violet-700/50 text-xs text-violet-200">
              {claimMsg}
            </div>
          )}

          {/* Recent Ledger Transactions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
              <span>Immutable Ledger History</span>
              <span className="text-xs text-slate-500 font-normal">Server-verified</span>
            </h3>

            <div className="rounded-xl border border-brand-darkBorder overflow-hidden bg-brand-darkPanel/40">
              {walletData?.transactions && walletData.transactions.length > 0 ? (
                <div className="divide-y divide-brand-darkBorder/60 max-h-48 overflow-y-auto">
                  {walletData.transactions.map((tx) => (
                    <div key={tx.id} className="p-3 flex items-center justify-between text-xs hover:bg-white/5 transition">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-lg ${tx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {tx.amount > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{tx.reason}</div>
                          <div className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className={`font-mono font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} credit
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No credit transactions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
