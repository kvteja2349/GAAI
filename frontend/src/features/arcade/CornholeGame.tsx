import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { Trophy, ArrowLeft, RotateCcw, Play, AlertCircle } from 'lucide-react';

interface ThrowEvent {
  throwNumber: number;
  player: 'human' | 'ai';
  power: number;
  angleDeg: number;
  result: 'hole' | 'board' | 'miss';
  points: number;
  timestamp: number;
}

export const CornholeGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { refreshBalances } = useCredits();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState<string | null>(null);

  const [humanScore, setHumanScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [throwPower, setThrowPower] = useState(65);
  const [aimAngle, setAimAngle] = useState(0); // -15 to +15 deg
  const [isThrowing, setIsThrowing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [throwsLog, setThrowsLog] = useState<ThrowEvent[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [creditWon, setCreditWon] = useState(false);

  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 300;

  const animRef = useRef<number | null>(null);

  const initGame = async () => {
    try {
      const session = await api.startArcadeSession('cornhole');
      setSessionId(session.sessionId);
      setSessionNonce(session.sessionNonce);
      setHumanScore(0);
      setAiScore(0);
      setThrowsLog([]);
      setLastResult(null);
      setGameOver(false);
      setServerMsg(null);
      setCreditWon(false);
      setIsThrowing(false);
      drawStaticScene();
    } catch (e: any) {
      setServerMsg('Failed to init cornhole session: ' + e.message);
    }
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleHumanThrow = () => {
    if (isThrowing || gameOver) return;
    setIsThrowing(true);

    // Compute trajectory
    // Target power sweet spot: 62 to 74
    // Target angle sweet spot: -3 to +3
    const absAngle = Math.abs(aimAngle);
    let result: 'hole' | 'board' | 'miss' = 'miss';
    let points = 0;

    if (throwPower >= 65 && throwPower <= 71 && absAngle <= 2) {
      result = 'hole';
      points = 3;
    } else if (throwPower >= 55 && throwPower <= 82 && absAngle <= 8) {
      result = 'board';
      points = 1;
    } else {
      result = 'miss';
      points = 0;
    }

    animateThrow('human', throwPower, aimAngle, result, () => {
      const newScore = humanScore + points;
      setHumanScore(newScore);
      setLastResult(`Your throw: ${result.toUpperCase()} (+${points} pts)`);

      const throwEvt: ThrowEvent = {
        throwNumber: throwsLog.length + 1,
        player: 'human',
        power: throwPower,
        angleDeg: aimAngle,
        result,
        points,
        timestamp: Date.now()
      };
      const updatedLog = [...throwsLog, throwEvt];
      setThrowsLog(updatedLog);

      if (newScore >= 21) {
        checkGameEnd(newScore, aiScore, updatedLog);
        return;
      }

      // AI turn after short delay
      setTimeout(() => {
        handleAiThrow(updatedLog, newScore);
      }, 700);
    });
  };

  const handleAiThrow = (currentLog: ThrowEvent[], currentHumanScore: number) => {
    const aiPower = Math.floor(58 + Math.random() * 22);
    const aiAngle = Math.floor(-6 + Math.random() * 12);
    let result: 'hole' | 'board' | 'miss' = 'miss';
    let points = 0;

    if (aiPower >= 65 && aiPower <= 71 && Math.abs(aiAngle) <= 2) {
      result = 'hole';
      points = 3;
    } else if (aiPower >= 55 && aiPower <= 82 && Math.abs(aiAngle) <= 8) {
      result = 'board';
      points = 1;
    }

    animateThrow('ai', aiPower, aiAngle, result, () => {
      const newAiScore = aiScore + points;
      setAiScore(newAiScore);
      setLastResult(prev => `${prev} | AI: ${result.toUpperCase()} (+${points} pts)`);

      const aiEvt: ThrowEvent = {
        throwNumber: currentLog.length + 1,
        player: 'ai',
        power: aiPower,
        angleDeg: aiAngle,
        result,
        points,
        timestamp: Date.now()
      };
      const finalLog = [...currentLog, aiEvt];
      setThrowsLog(finalLog);
      setIsThrowing(false);

      if (newAiScore >= 21 || currentHumanScore >= 21) {
        checkGameEnd(currentHumanScore, newAiScore, finalLog);
      }
    });
  };

  const animateThrow = (
    player: 'human' | 'ai',
    power: number,
    angle: number,
    result: string,
    onFinish: () => void
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let progress = 0;
    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT - 20;
    const targetX = CANVAS_WIDTH / 2 + angle * 8;
    const targetY = 110;

    const loop = () => {
      progress += 0.04;
      drawStaticScene();

      // Draw bag arc
      const currentX = startX + (targetX - startX) * progress;
      const arcHeight = Math.sin(progress * Math.PI) * 90;
      const currentY = startY + (targetY - startY) * progress - arcHeight;
      const scale = 1.4 - progress * 0.6;

      ctx.save();
      ctx.translate(currentX, currentY);
      ctx.fillStyle = player === 'human' ? '#8b5cf6' : '#06b6d4';
      ctx.fillRect(-8 * scale, -8 * scale, 16 * scale, 16 * scale);
      ctx.restore();

      if (progress < 1) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        drawStaticScene();
        onFinish();
      }
    };
    animRef.current = requestAnimationFrame(loop);
  };

  const checkGameEnd = async (hScore: number, aScore: number, log: ThrowEvent[]) => {
    setGameOver(true);
    setIsThrowing(false);

    if (!sessionId || !sessionNonce) return;

    try {
      const res = await api.verifyArcadeReward(sessionId, sessionNonce, {
        throws: log
      });

      setServerMsg(res.message);
      if (res.won && res.creditAwarded > 0) {
        setCreditWon(true);
        confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 } });
        await refreshBalances();
      }
    } catch (e: any) {
      setServerMsg('Verification error: ' + e.message);
    }
  };

  const drawStaticScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Grass Field
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Cornhole Board (perspective quad)
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 50, 70);
    ctx.lineTo(CANVAS_WIDTH / 2 + 50, 70);
    ctx.lineTo(CANVAS_WIDTH / 2 + 80, 160);
    ctx.lineTo(CANVAS_WIDTH / 2 - 80, 160);
    ctx.closePath();
    ctx.fillStyle = '#fef3c7'; // wooden board
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#92400e';
    ctx.stroke();

    // The Hole (3 Points)
    ctx.beginPath();
    ctx.ellipse(CANVAS_WIDTH / 2, 95, 14, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#78350f';
    ctx.stroke();

    // Board text
    ctx.fillStyle = '#92400e';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('3 PTS', CANVAS_WIDTH / 2, 98);
    ctx.fillText('1 PT (BOARD)', CANVAS_WIDTH / 2, 135);
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arcade</span>
        </button>

        <button
          onClick={initGame}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart Match</span>
        </button>
      </div>

      {/* Rules Banner */}
      <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Cornhole Classic
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              Reach 21 pts & beat AI for +1 Credit
            </span>
          </h2>
          <p className="text-xs text-slate-400">Aim lateral angle and adjust toss power. Hole = 3 pts, Board = 1 pt.</p>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-800/40 text-center">
          <div className="text-[10px] uppercase font-bold tracking-wider text-violet-300">Your Score</div>
          <div className="text-3xl font-extrabold font-mono text-white mt-1">
            {humanScore} <span className="text-xs text-slate-400">/ 21</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-center">
          <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-300">AI Score</div>
          <div className="text-3xl font-extrabold font-mono text-white mt-1">
            {aiScore} <span className="text-xs text-slate-400">/ 21</span>
          </div>
        </div>
      </div>

      {/* Canvas Toss Arena */}
      <div className="rounded-2xl overflow-hidden border border-brand-darkBorder shadow-glow-violet bg-[#0a0c14] flex justify-center p-3">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-xl shadow-2xl max-w-full h-auto"
        />
      </div>

      {/* Controls */}
      {!gameOver && (
        <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Lateral Aim:</span>
                <span className="font-mono text-violet-400">{aimAngle}°</span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                value={aimAngle}
                onChange={(e) => setAimAngle(parseInt(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Toss Power:</span>
                <span className="font-mono text-cyan-400">{throwPower}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                value={throwPower}
                onChange={(e) => setThrowPower(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={handleHumanThrow}
            disabled={isThrowing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isThrowing ? 'Bag Flying...' : 'TOSS CORNHOLE BAG'}</span>
          </button>
        </div>
      )}

      {lastResult && (
        <div className="p-3 rounded-xl bg-brand-darkPanel border border-brand-darkBorder text-center text-xs font-mono text-cyan-300">
          {lastResult}
        </div>
      )}

      {/* Game Over Banner */}
      {gameOver && (
        <div className={`p-4 rounded-2xl text-center border animate-fadeIn ${
          creditWon
            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-glow-violet'
            : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}>
          <div className="font-bold text-base mb-1 flex items-center justify-center gap-2">
            {creditWon ? <Trophy className="w-5 h-5 text-amber-400" /> : <AlertCircle className="w-5 h-5" />}
            {creditWon ? 'Cornhole Champion! +1 Credit Won!' : 'Match Finished'}
          </div>
          <p className="text-xs mb-3">{serverMsg || 'Game completed.'}</p>
          <button
            onClick={initGame}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-xs shadow-glow-violet transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
