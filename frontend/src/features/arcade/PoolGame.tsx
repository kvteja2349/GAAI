import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { Trophy, ArrowLeft, RotateCcw, Play, AlertCircle } from 'lucide-react';

interface Ball {
  id: number; // 0 is cue ball, 8 is eight-ball, 1-7 solids, 9-15 stripes
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isPocketed: boolean;
}

export const PoolGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { refreshBalances } = useCredits();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState<string | null>(null);

  const [cueAngle, setCueAngle] = useState(0); // radians
  const [cuePower, setCuePower] = useState(40); // 1-100
  const [isAiming, setIsAiming] = useState(true);
  const [shotsLog, setShotsLog] = useState<any[]>([]);
  const [pocketedList, setPocketedList] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [creditWon, setCreditWon] = useState(false);

  const ballsRef = useRef<Ball[]>([]);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const TABLE_WIDTH = 560;
  const TABLE_HEIGHT = 280;
  const BALL_RADIUS = 9;

  const pockets = [
    { x: 20, y: 20 },
    { x: TABLE_WIDTH / 2, y: 15 },
    { x: TABLE_WIDTH - 20, y: 20 },
    { x: 20, y: TABLE_HEIGHT - 20 },
    { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 15 },
    { x: TABLE_WIDTH - 20, y: TABLE_HEIGHT - 20 }
  ];

  const initGame = async () => {
    try {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const session = await api.startArcadeSession('pool');
      setSessionId(session.sessionId);
      setSessionNonce(session.sessionNonce);
      setShotsLog([]);
      setPocketedList([]);
      setGameOver(false);
      setServerMsg(null);
      setCreditWon(false);
      startTimeRef.current = Date.now();

      // Initialize cue ball + rack of balls
      const balls: Ball[] = [
        { id: 0, x: 140, y: TABLE_HEIGHT / 2, vx: 0, vy: 0, color: '#ffffff', isPocketed: false } // Cue ball
      ];

      // Rack
      const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#f97316'];
      let idCounter = 1;
      const startX = 380;
      const startY = TABLE_HEIGHT / 2;

      for (let col = 0; col < 4; col++) {
        for (let row = 0; row <= col; row++) {
          const bx = startX + col * (BALL_RADIUS * 1.8);
          const by = startY + (row - col / 2) * (BALL_RADIUS * 2.1);
          let bId = idCounter;
          let colStr = colors[(idCounter - 1) % colors.length];

          if (col === 2 && row === 1) {
            bId = 8; // Eight ball in center
            colStr = '#111827';
          } else {
            idCounter++;
          }

          balls.push({
            id: bId,
            x: bx,
            y: by,
            vx: 0,
            vy: 0,
            color: colStr,
            isPocketed: false
          });
        }
      }

      ballsRef.current = balls;
      setIsAiming(true);
      startPhysicsLoop();
    } catch (e: any) {
      setServerMsg('Failed to init pool session: ' + e.message);
    }
  };

  useEffect(() => {
    initGame();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleShoot = () => {
    if (!isAiming || gameOver) return;

    const cueBall = ballsRef.current.find(b => b.id === 0);
    if (!cueBall || cueBall.isPocketed) return;

    const speed = (cuePower / 100) * 16;
    cueBall.vx = Math.cos(cueAngle) * speed;
    cueBall.vy = Math.sin(cueAngle) * speed;

    setIsAiming(false);

    // Record shot event
    const shotRecord = {
      shotNumber: shotsLog.length + 1,
      cuePower,
      aimAngleRad: cueAngle,
      ballsPocketed: [] as number[],
      cueBallPocketed: false,
      timestamp: Date.now()
    };
    setShotsLog(prev => [...prev, shotRecord]);
  };

  const startPhysicsLoop = () => {
    const loop = () => {
      updatePhysics();
      renderCanvas();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  };

  const updatePhysics = () => {
    const balls = ballsRef.current;
    let anyMoving = false;

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.isPocketed) continue;

      if (Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05) {
        anyMoving = true;
      }

      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.985; // friction
      b.vy *= 0.985;

      // Wall cushions
      if (b.x < 30 + BALL_RADIUS) { b.x = 30 + BALL_RADIUS; b.vx *= -0.85; }
      if (b.x > TABLE_WIDTH - 30 - BALL_RADIUS) { b.x = TABLE_WIDTH - 30 - BALL_RADIUS; b.vx *= -0.85; }
      if (b.y < 30 + BALL_RADIUS) { b.y = 30 + BALL_RADIUS; b.vy *= -0.85; }
      if (b.y > TABLE_HEIGHT - 30 - BALL_RADIUS) { b.y = TABLE_HEIGHT - 30 - BALL_RADIUS; b.vy *= -0.85; }

      // Pocket check
      for (const p of pockets) {
        const dist = Math.hypot(b.x - p.x, b.y - p.y);
        if (dist < 20) {
          b.isPocketed = true;
          b.vx = 0;
          b.vy = 0;
          setPocketedList(prev => [...prev, b.id]);

          if (b.id === 0) {
            // Scratch! Respawn cue ball
            setTimeout(() => {
              b.isPocketed = false;
              b.x = 140;
              b.y = TABLE_HEIGHT / 2;
            }, 600);
          } else if (b.id === 8) {
            // Eight ball sunk
            handleEightBallSunk();
          }
        }
      }
    }

    // Ball-to-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];
        if (b1.isPocketed || b2.isPocketed) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);

        if (dist < BALL_RADIUS * 2) {
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);

          // Overlap resolution
          const overlap = BALL_RADIUS * 2 - dist;
          b1.x -= cos * (overlap / 2);
          b1.y -= sin * (overlap / 2);
          b2.x += cos * (overlap / 2);
          b2.y += sin * (overlap / 2);

          // Elastic collision velocity swap
          const v1x = b1.vx * cos + b1.vy * sin;
          const v1y = b1.vy * cos - b1.vx * sin;
          const v2x = b2.vx * cos + b2.vy * sin;
          const v2y = b2.vy * cos - b2.vx * sin;

          b1.vx = v2x * cos - v1y * sin;
          b1.vy = v1y * cos + v2x * sin;
          b2.vx = v1x * cos - v2y * sin;
          b2.vy = v2y * cos + v1x * sin;
        }
      }
    }

    if (!anyMoving && !isAiming && !gameOver) {
      setIsAiming(true);
    }
  };

  const handleEightBallSunk = async () => {
    setGameOver(true);
    if (!sessionId || !sessionNonce) return;

    try {
      const res = await api.verifyArcadeReward(sessionId, sessionNonce, {
        shots: shotsLog
      });

      setServerMsg(res.message);
      if (res.won && res.creditAwarded > 0) {
        setCreditWon(true);
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        await refreshBalances();
      }
    } catch (e: any) {
      setServerMsg('Verification error: ' + e.message);
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Table Felt (green velvet)
    ctx.fillStyle = '#0f5132';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Wood Cushion border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#78350f';
    ctx.strokeRect(7, 7, TABLE_WIDTH - 14, TABLE_HEIGHT - 14);

    // Draw Pockets
    for (const p of pockets) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#09090b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#451a03';
      ctx.stroke();
    }

    // Draw Balls
    const balls = ballsRef.current;
    for (const b of balls) {
      if (b.isPocketed) continue;

      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      if (b.id === 8) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('8', b.x, b.y + 3);
      }
    }

    // Draw Cue Aim Line when aiming
    const cueBall = balls.find(b => b.id === 0);
    if (isAiming && cueBall && !cueBall.isPocketed) {
      ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(
        cueBall.x + Math.cos(cueAngle) * (cuePower * 1.5),
        cueBall.y + Math.sin(cueAngle) * (cuePower * 1.5)
      );
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
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
          <span>Rerack Balls</span>
        </button>
      </div>

      {/* Rules Banner */}
      <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Eight-Ball Pool
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Clear & Sink 8 for +1 Credit
            </span>
          </h2>
          <p className="text-xs text-slate-400">Aim with the angle slider, set cue power, and sink the 8-ball cleanly without scratching.</p>
        </div>
      </div>

      {/* Pool Table Canvas */}
      <div className="rounded-2xl overflow-hidden border border-brand-darkBorder shadow-glow-violet bg-[#0a0c14] flex justify-center p-3">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          className="rounded-xl shadow-2xl max-w-full h-auto"
        />
      </div>

      {/* Controls */}
      {!gameOver && (
        <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Aim Angle:</span>
                <span className="font-mono text-cyan-400">{(cueAngle * 180 / Math.PI).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step={0.02}
                value={cueAngle}
                onChange={(e) => setCueAngle(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Cue Power:</span>
                <span className="font-mono text-violet-400">{cuePower}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={cuePower}
                onChange={(e) => setCuePower(parseInt(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
          </div>

          <button
            onClick={handleShoot}
            disabled={!isAiming}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isAiming ? 'STRIKE CUE BALL' : 'Balls in Motion...'}</span>
          </button>
        </div>
      )}

      {/* Pocketed Balls Tracker */}
      <div className="p-3 rounded-xl bg-brand-darkPanel border border-brand-darkBorder flex items-center justify-between text-xs">
        <span className="text-slate-400">Pocketed Balls:</span>
        <div className="flex gap-1.5">
          {pocketedList.map((id, i) => (
            <span key={i} className="w-5 h-5 rounded-full bg-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">
              {id}
            </span>
          ))}
          {pocketedList.length === 0 && <span className="text-slate-500 italic">None yet</span>}
        </div>
      </div>

      {/* Game Over Banner */}
      {gameOver && (
        <div className={`p-4 rounded-2xl text-center border animate-fadeIn ${
          creditWon
            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-glow-violet'
            : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}>
          <div className="font-bold text-base mb-1 flex items-center justify-center gap-2">
            {creditWon ? <Trophy className="w-5 h-5 text-amber-400" /> : <AlertCircle className="w-5 h-5" />}
            {creditWon ? '8-Ball Pocketed! Victory!' : 'Match Finished'}
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
