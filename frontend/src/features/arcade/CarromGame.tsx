import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { Trophy, ArrowLeft, RotateCcw, Play, AlertCircle } from 'lucide-react';

interface Piece {
  id: number;
  type: 'white' | 'black' | 'queen' | 'striker';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isPocketed: boolean;
}

export const CarromGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { refreshBalances } = useCredits();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState<string | null>(null);

  const [strikerX, setStrikerX] = useState(200);
  const [strikeAngle, setStrikeAngle] = useState(-Math.PI / 2); // aiming up
  const [strikePower, setStrikePower] = useState(50);
  const [isAiming, setIsAiming] = useState(true);
  const [playerScore, setPlayerScore] = useState(0);
  const [strikesLog, setStrikesLog] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [creditWon, setCreditWon] = useState(false);

  const BOARD_SIZE = 400;
  const pockets = [
    { x: 30, y: 30 },
    { x: BOARD_SIZE - 30, y: 30 },
    { x: 30, y: BOARD_SIZE - 30 },
    { x: BOARD_SIZE - 30, y: BOARD_SIZE - 30 }
  ];

  const piecesRef = useRef<Piece[]>([]);
  const animRef = useRef<number | null>(null);

  const initBoard = async () => {
    try {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const session = await api.startArcadeSession('carrom');
      setSessionId(session.sessionId);
      setSessionNonce(session.sessionNonce);
      setPlayerScore(0);
      setStrikesLog([]);
      setGameOver(false);
      setServerMsg(null);
      setCreditWon(false);

      // Setup carrom men in center circle
      const pieces: Piece[] = [];
      const center = BOARD_SIZE / 2;

      // Queen in exact center
      pieces.push({
        id: 0,
        type: 'queen',
        x: center,
        y: center,
        vx: 0,
        vy: 0,
        radius: 10,
        isPocketed: false
      });

      // Ring of 6 alternating white & black pieces
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        pieces.push({
          id: i + 1,
          type: i % 2 === 0 ? 'white' : 'black',
          x: center + Math.cos(ang) * 22,
          y: center + Math.sin(ang) * 22,
          vx: 0,
          vy: 0,
          radius: 10,
          isPocketed: false
        });
      }

      // Striker at baseline
      pieces.push({
        id: 99,
        type: 'striker',
        x: strikerX,
        y: BOARD_SIZE - 60,
        vx: 0,
        vy: 0,
        radius: 14,
        isPocketed: false
      });

      piecesRef.current = pieces;
      setIsAiming(true);
      startLoop();
    } catch (e: any) {
      setServerMsg('Failed to init carrom session: ' + e.message);
    }
  };

  useEffect(() => {
    initBoard();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleStrike = () => {
    if (!isAiming || gameOver) return;

    const striker = piecesRef.current.find(p => p.type === 'striker');
    if (!striker) return;

    const speed = (strikePower / 100) * 18;
    striker.vx = Math.cos(strikeAngle) * speed;
    striker.vy = Math.sin(strikeAngle) * speed;

    setIsAiming(false);

    const strikeEvent = {
      strikeNumber: strikesLog.length + 1,
      strikerX,
      power: strikePower,
      angleRad: strikeAngle,
      pocketedWhite: 0,
      pocketedBlack: 0,
      pocketedQueen: false,
      strikerFoul: false,
      timestamp: Date.now()
    };
    setStrikesLog(prev => [...prev, strikeEvent]);
  };

  const startLoop = () => {
    const loop = () => {
      updatePhysics();
      drawBoard();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  };

  const updatePhysics = () => {
    const pieces = piecesRef.current;
    let anyMoving = false;

    for (const p of pieces) {
      if (p.isPocketed) continue;

      if (Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05) {
        anyMoving = true;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98; // carrom board friction
      p.vy *= 0.98;

      // Board border rebounds
      const pad = 24 + p.radius;
      if (p.x < pad) { p.x = pad; p.vx *= -0.85; }
      if (p.x > BOARD_SIZE - pad) { p.x = BOARD_SIZE - pad; p.vx *= -0.85; }
      if (p.y < pad) { p.y = pad; p.vy *= -0.85; }
      if (p.y > BOARD_SIZE - pad) { p.y = BOARD_SIZE - pad; p.vy *= -0.85; }

      // Pocket collisions
      for (const pocket of pockets) {
        const dist = Math.hypot(p.x - pocket.x, p.y - pocket.y);
        if (dist < 22) {
          p.isPocketed = true;
          p.vx = 0;
          p.vy = 0;

          if (p.type === 'white') {
            setPlayerScore(prev => prev + 10);
          } else if (p.type === 'queen') {
            setPlayerScore(prev => prev + 25);
          } else if (p.type === 'striker') {
            // Foul! Respawn
            setPlayerScore(prev => Math.max(0, prev - 5));
          }
        }
      }
    }

    // Piece-to-piece elastic collisions
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const p1 = pieces[i];
        const p2 = pieces[j];
        if (p1.isPocketed || p2.isPocketed) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist) {
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);

          const overlap = minDist - dist;
          p1.x -= cos * (overlap / 2);
          p1.y -= sin * (overlap / 2);
          p2.x += cos * (overlap / 2);
          p2.y += sin * (overlap / 2);

          const v1x = p1.vx * cos + p1.vy * sin;
          const v1y = p1.vy * cos - p1.vx * sin;
          const v2x = p2.vx * cos + p2.vy * sin;
          const v2y = p2.vy * cos - p2.vx * sin;

          p1.vx = v2x * cos - v1y * sin;
          p1.vy = v1y * cos + v2x * sin;
          p2.vx = v1x * cos - v2y * sin;
          p2.vy = v2y * cos + v1x * sin;
        }
      }
    }

    if (!anyMoving && !isAiming && !gameOver) {
      // Reposition striker at baseline
      const striker = pieces.find(p => p.type === 'striker');
      if (striker) {
        striker.isPocketed = false;
        striker.x = strikerX;
        striker.y = BOARD_SIZE - 60;
        striker.vx = 0;
        striker.vy = 0;
      }
      setIsAiming(true);

      // Check if target score of 25+ points is achieved
      if (playerScore >= 25 && !gameOver) {
        handleCarromWin();
      }
    }
  };

  const handleCarromWin = async () => {
    setGameOver(true);
    if (!sessionId || !sessionNonce) return;

    try {
      const res = await api.verifyArcadeReward(sessionId, sessionNonce, {
        strikes: strikesLog
      });

      setServerMsg(res.message);
      if (res.won && res.creditAwarded > 0) {
        setCreditWon(true);
        confetti({ particleCount: 130, spread: 75, origin: { y: 0.6 } });
        await refreshBalances();
      }
    } catch (e: any) {
      setServerMsg('Verification error: ' + e.message);
    }
  };

  const drawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Board Surface (Polished wood)
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Frame
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#451a03';
    ctx.strokeRect(10, 10, BOARD_SIZE - 20, BOARD_SIZE - 20);

    // Pockets
    for (const p of pockets) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    }

    // Center Circle
    const center = BOARD_SIZE / 2;
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, Math.PI * 2);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Baseline indicator
    ctx.beginPath();
    ctx.moveTo(80, BOARD_SIZE - 60);
    ctx.lineTo(BOARD_SIZE - 80, BOARD_SIZE - 60);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Pieces
    const pieces = piecesRef.current;
    for (const p of pieces) {
      if (p.isPocketed) continue;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (p.type === 'queen') {
        ctx.fillStyle = '#dc2626';
      } else if (p.type === 'white') {
        ctx.fillStyle = '#ffffff';
      } else if (p.type === 'black') {
        ctx.fillStyle = '#1e293b';
      } else if (p.type === 'striker') {
        ctx.fillStyle = '#f59e0b';
      }

      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }

    // Draw Aiming Line
    const striker = pieces.find(p => p.type === 'striker');
    if (isAiming && striker && !striker.isPocketed) {
      ctx.beginPath();
      ctx.moveTo(striker.x, striker.y);
      ctx.lineTo(
        striker.x + Math.cos(strikeAngle) * (strikePower * 1.5),
        striker.y + Math.sin(strikeAngle) * (strikePower * 1.5)
      );
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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
          onClick={initBoard}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Board</span>
        </button>
      </div>

      {/* Rules Banner */}
      <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Carrom Championship
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Score 25+ pts for +1 Credit
            </span>
          </h2>
          <p className="text-xs text-slate-400">Position striker along baseline, set angle and power, pocket coins into corner pockets.</p>
        </div>
      </div>

      {/* Scorecard */}
      <div className="p-3 rounded-xl bg-brand-darkPanel border border-brand-darkBorder flex items-center justify-between text-xs">
        <span className="text-slate-300">Your Score: <strong className="font-mono text-cyan-400 text-sm">{playerScore} pts</strong></span>
        <span className="text-slate-400">Target: <strong className="text-white font-mono">25+ pts</strong> (White = 10 pts, Queen = 25 pts)</span>
      </div>

      {/* Canvas Board */}
      <div className="rounded-2xl overflow-hidden border border-brand-darkBorder shadow-glow-violet bg-[#0a0c14] flex justify-center p-3">
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          className="rounded-xl shadow-2xl max-w-full h-auto"
        />
      </div>

      {/* Controls */}
      {!gameOver && (
        <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Striker Position:</span>
              </div>
              <input
                type="range"
                min={100}
                max={300}
                value={strikerX}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setStrikerX(val);
                  const striker = piecesRef.current.find(p => p.type === 'striker');
                  if (striker) striker.x = val;
                }}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Strike Angle:</span>
                <span className="font-mono text-violet-400">{(strikeAngle * 180 / Math.PI).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min={-Math.PI}
                max={0}
                step={0.05}
                value={strikeAngle}
                onChange={(e) => setStrikeAngle(parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Power:</span>
                <span className="font-mono text-cyan-400">{strikePower}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={100}
                value={strikePower}
                onChange={(e) => setStrikePower(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={handleStrike}
            disabled={!isAiming}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isAiming ? 'STRIKE COINS' : 'Pieces Moving...'}</span>
          </button>
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
            {creditWon ? 'Carrom Victory! +1 Credit Won!' : 'Match Finished'}
          </div>
          <p className="text-xs mb-3">{serverMsg || 'Game completed.'}</p>
          <button
            onClick={initBoard}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-xs shadow-glow-violet transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
