import React, { useState } from 'react';
import { useCredits } from '../../hooks/useCredits.js';
import {
  Gamepad2,
  Trophy,
  Coins,
  Sparkles,
  Zap,
  Target,
  Crown,
  CircleDot
} from 'lucide-react';
import { TicTacToeGame } from './TicTacToeGame.js';
import { CricketGame } from './CricketGame.js';
import { MiniChessGame } from './MiniChessGame.js';
import { PoolGame } from './PoolGame.js';
import { CarromGame } from './CarromGame.js';
import { CornholeGame } from './CornholeGame.js';

type ActiveGame = 'tictactoe' | 'pool' | 'chess' | 'carrom' | 'cornhole' | 'cricket' | null;

export const ArcadeHub: React.FC = () => {
  const { balances, openWalletModal } = useCredits();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  if (activeGame === 'tictactoe') return <TicTacToeGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'cricket') return <CricketGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'chess') return <MiniChessGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'pool') return <PoolGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'carrom') return <CarromGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'cornhole') return <CornholeGame onBack={() => setActiveGame(null)} />;

  const gameCards = [
    {
      id: 'cricket',
      title: 'Six-Ball Cricket Challenge',
      category: 'Batting Skill',
      reward: '+1 Credit',
      desc: 'Face 6 deliveries from pace & spin bowlers. Score at least 25 runs to win!',
      rules: 'MANDATORY: Minimum 25 runs in 6 balls. Wicket ends challenge.',
      icon: Zap,
      gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      border: 'hover:border-amber-500/50',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      hot: true
    },
    {
      id: 'tictactoe',
      title: 'Tic-Tac-Toe',
      category: 'Strategy & Logic',
      reward: '+1 Credit',
      desc: 'Classic 3x3 strategy against Minimax AI. Connect three symbols in a row to win.',
      rules: 'Only wins qualify. Draws or losses award no credits.',
      icon: CircleDot,
      gradient: 'from-violet-500/20 via-purple-500/10 to-transparent',
      border: 'hover:border-violet-500/50',
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    },
    {
      id: 'pool',
      title: 'Eight-Ball Pool',
      category: 'Canvas Billiards Physics',
      reward: '+1 Credit',
      desc: 'Realistic 2D canvas billiards with cue ball aiming, collision physics and pockets.',
      rules: 'Clear your object balls and legally pocket the 8-ball without scratching.',
      icon: Target,
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      border: 'hover:border-emerald-500/50',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'chess',
      title: 'Mini Chess',
      category: 'Grandmaster Logic',
      reward: '+1 Credit',
      desc: 'Full chess legal move validation with checkmate and stalemate detection.',
      rules: 'Checkmate the AI opponent. Draws or stalemates do not award credits.',
      icon: Crown,
      gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
      border: 'hover:border-orange-500/50',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    },
    {
      id: 'carrom',
      title: 'Carrom Championship',
      category: 'Board Physics',
      reward: '+1 Credit',
      desc: 'Striker angles, baseline placement, rebound geometry and Queen cover points.',
      rules: 'Score at least 25 points and beat AI to claim the credit.',
      icon: Trophy,
      gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      border: 'hover:border-cyan-500/50',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    {
      id: 'cornhole',
      title: 'Cornhole Classic',
      category: 'Precision Toss',
      reward: '+1 Credit',
      desc: 'Adjust pitch angle and throw velocity towards the cornhole target board.',
      rules: 'Score 21+ points (Hole = 3 pts, Board = 1 pt) and beat the AI opponent.',
      icon: Gamepad2,
      gradient: 'from-pink-500/20 via-rose-500/10 to-transparent',
      border: 'hover:border-pink-500/50',
      badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-brand-darkBg transition-colors max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-violet-950/60 via-brand-darkPanel to-cyan-950/40 border border-violet-500/30 shadow-glass overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold border border-violet-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GAAI ARCADE • SERVER-VALIDATED REWARDS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Play Games. Win Verified Credits.
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Win any of our six browser-based arcade games to earn <strong>+1 Credit per win</strong>. Each credit grants up to 500 generated AI lines!
            </p>
          </div>

          {/* Quick Wallet Stats Box */}
          <div
            onClick={openWalletModal}
            className="p-5 rounded-2xl bg-brand-darkSurface/90 border border-brand-darkBorder hover:border-violet-500/50 cursor-pointer transition shadow-glow-violet space-y-2 shrink-0 group"
          >
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-between">
              <span>Your Wallet</span>
              <Coins className="w-4 h-4 text-brand-violet group-hover:rotate-12 transition" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">
              {balances?.total ?? 0} <span className="text-sm font-normal text-slate-400">Credits</span>
            </div>
            <div className="text-[11px] text-amber-400 font-medium">
              🏆 {balances?.game ?? 0} earned from game wins
            </div>
          </div>
        </div>
      </div>

      {/* Six Game Catalog Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Arcade Games</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              6 Playable
            </span>
          </h2>
          <span className="text-xs text-slate-400">Zero-cost • Instant play in browser</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gameCards.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder ${g.border} transition-all duration-300 shadow-sm hover:shadow-glow-violet group`}
              >
                {/* Background accent glow */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${g.gradient} pointer-events-none opacity-50`}></div>

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:scale-105 transition transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${g.badgeColor}`}>
                      {g.reward}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {g.category}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5 group-hover:text-cyan-300 transition">
                      {g.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {g.desc}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-400">
                    <strong className="text-slate-300">Rules:</strong> {g.rules}
                  </div>
                </div>

                <div className="relative z-10 pt-5">
                  <button
                    onClick={() => setActiveGame(g.id as any)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-glow-violet transition transform active:scale-95"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Launch & Play</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
