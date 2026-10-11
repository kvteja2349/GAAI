import React from 'react';
import {
  Gamepad2,
  Coins,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Code2,
  Lock
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-brand-darkBg transition-colors max-w-5xl mx-auto">
      {/* Brand Hero */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-violet-950/70 via-brand-darkPanel to-cyan-950/50 border border-violet-500/30 shadow-glass overflow-hidden space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold border border-violet-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PRODUCTION-GRADE AI ARCHITECTURE</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          About <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300">GAAI</span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
          <strong>GAAI</strong> stands for <strong>Gaming AI — Artificial Intelligence</strong>. It is a full-stack, responsive web application engineered to combine deep artificial intelligence capabilities with an interactive, credit-rewarding browser arcade.
        </p>
      </div>

      {/* Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-3">
          <div className="p-2.5 rounded-xl bg-violet-500/20 text-brand-violet w-fit border border-violet-500/30">
            <Coins className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Credit Economics</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every user starts with <strong>5 Welcome Credits</strong>. Every day at midnight (<code className="text-violet-300">Asia/Kolkata</code>), an additional <strong>5 Daily Credits</strong> are automatically granted. Each credit authorizes up to <strong>500 output lines</strong>.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-brand-cyan w-fit border border-cyan-500/30">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Verified 6-Game Arcade</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Play Tic-Tac-Toe, 8-Ball Pool, Mini Chess, Carrom, Cornhole, or the Six-Ball Cricket Challenge. Every win is strictly <strong>validated on the server</strong> before granting <strong>+1 Credit</strong>.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 w-fit border border-emerald-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Zero Cloud Leak Privacy</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unlike traditional platforms that store every chat in centralized cloud databases, GAAI saves your conversation history and file attachments in <strong>your browser's local storage</strong> by default.
          </p>
        </div>
      </div>

      {/* Detailed Technical Sections */}
      <div className="space-y-6">
        {/* Credit Rules */}
        <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Credit System & 500-Line Limit
          </h2>
          <div className="text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              1. <strong>Output Line Counting:</strong> AI generation is accounted line-by-line on the server. If an answer exceeds 500 lines, GAAI checks if you have an available credit and auto-continues seamlessly.
            </p>
            <p>
              2. <strong>Credit Out Protection:</strong> If your balance hits 0, generation stops gracefully with the notice: <em>"You're out of credits."</em> You can open the Arcade to play and top up your credits.
            </p>
            <p>
              3. <strong>Immutable Ledger:</strong> Every transaction (welcome grant, daily claim, game reward, generation debit) is recorded in an immutable ledger with unique idempotency keys.
            </p>
          </div>
        </div>

        {/* Free Tier Reality */}
        <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-violet" />
            The ₹0/Month Architecture & Free Tier Truth
          </h2>
          <div className="text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              GAAI is engineered to run on a target budget of <strong>₹0/month</strong> by harnessing:
            </p>
            <ul className="list-disc ml-5 space-y-1 text-slate-300">
              <li><strong>Google Gemini Free Tier:</strong> 15 requests per minute with 1M context token capacity.</li>
              <li><strong>Groq Cloud Free Tier:</strong> Ultra-fast Llama 3.3 70B inference at up to 300 tokens/sec.</li>
              <li><strong>Ollama Local Inference:</strong> 100% offline desktop AI execution on your local GPU/CPU.</li>
              <li><strong>Pollinations.ai Image Gen:</strong> Zero-cost, high-fidelity Flux.1 image synthesis.</li>
              <li><strong>DuckDuckGo Live Search:</strong> Real web search retrieval without subscription keys.</li>
            </ul>
            <p className="text-slate-400 italic pt-1">
              *Note: Free-tier AI services may have provider rate limits. GAAI features circuit-breakers, exponential backoff, and fallback routing to ensure seamless uptime.
            </p>
          </div>
        </div>

        {/* Arcade Games Breakdown */}
        <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            The Six Arcade Games
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-black/20 border border-brand-darkBorder">
              <strong className="text-white block mb-1">1. Tic-Tac-Toe:</strong>
              Strategy vs Minimax AI. Must get 3 in a row. Draws or losses do not award credits.
            </div>
            <div className="p-3.5 rounded-xl bg-black/20 border border-brand-darkBorder">
              <strong className="text-white block mb-1">2. Eight-Ball Pool:</strong>
              2D Canvas physics billiards. Clear object balls and legally pocket the 8-ball without scratching.
            </div>
            <div className="p-3.5 rounded-xl bg-black/20 border border-brand-darkBorder">
              <strong className="text-white block mb-1">3. Mini Chess:</strong>
              Algorithmic AI opponent with strict chess legal move validation. Checkmate required to win.
            </div>
            <div className="p-3.5 rounded-xl bg-black/20 border border-brand-darkBorder">
              <strong className="text-white block mb-1">4. Carrom Championship:</strong>
              Board physics with striker angles, white/black coins, and Queen cover mechanics (25+ pts to win).
            </div>
            <div className="p-3.5 rounded-xl bg-black/20 border border-brand-darkBorder">
              <strong className="text-white block mb-1">5. Cornhole Classic:</strong>
              Toss trajectory physics. Reach 21+ points (Hole = 3 pts, Board = 1 pt) to beat the AI.
            </div>
            <div className="p-3.5 rounded-xl bg-black/20 border border-brand-darkBorder">
              <strong className="text-white block mb-1">6. Six-Ball Cricket Challenge:</strong>
              Face 6 deliveries from pace/spin bowlers. <strong>MANDATORY: Must score 25+ runs to win the credit!</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
