import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { Trophy, ArrowLeft, RotateCcw, AlertTriangle, ShieldAlert, Zap } from 'lucide-react';

interface CricketDelivery {
  ballNumber: number;
  type: 'fast' | 'yorker' | 'bouncer' | 'spin' | 'inswing' | 'outswing';
  speedKmph: number;
}

interface ShotRecord {
  ballNumber: number;
  shotType: 'drive' | 'pull' | 'cut' | 'loft' | 'defend';
  timingOffsetMs: number;
}

interface BallOutcome {
  ballNumber: number;
  runs: number;
  isWicket: boolean;
  commentary: string;
}

export const CricketGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { refreshBalances } = useCredits();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<CricketDelivery[]>([]);
  const [currentBallIdx, setCurrentBallIdx] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [isWicketOut, setIsWicketOut] = useState(false);
  const [outcomes, setOutcomes] = useState<BallOutcome[]>([]);
  const [shotsLog, setShotsLog] = useState<ShotRecord[]>([]);

  // Ball animation state
  const [isBowling, setIsBowling] = useState(false);
  const [ballProgress, setBallProgress] = useState(0); // 0 to 100%
  const [selectedShot, setSelectedShot] = useState<'drive' | 'pull' | 'cut' | 'loft' | 'defend'>('drive');
  const [hitWindowActive, setHitWindowActive] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [creditWon, setCreditWon] = useState(false);
  const [matchOver, setMatchOver] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const bowlStartTimeRef = useRef<number>(0);
  const sweetSpotTimeRef = useRef<number>(0);

  const initChallenge = async () => {
    try {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      const session = await api.startArcadeSession('cricket');
      setSessionId(session.sessionId);
      setSessionNonce(session.sessionNonce);
      setDeliveries(session.initialState.deliveries || []);
      setCurrentBallIdx(0);
      setTotalScore(0);
      setIsWicketOut(false);
      setOutcomes([]);
      setShotsLog([]);
      setIsBowling(false);
      setBallProgress(0);
      setServerMsg(null);
      setCreditWon(false);
      setMatchOver(false);
    } catch (e: any) {
      setServerMsg('Failed to initialize cricket session: ' + e.message);
    }
  };

  useEffect(() => {
    initChallenge();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleStartDelivery = () => {
    if (isBowling || matchOver || currentBallIdx >= deliveries.length) return;

    setIsBowling(true);
    setBallProgress(0);
    setHitWindowActive(true);

    const delivery = deliveries[currentBallIdx];
    // Delivery takes between 900ms to 1200ms depending on speed
    const duration = Math.max(850, 1400 - (delivery.speedKmph * 3.5));
    bowlStartTimeRef.current = performance.now();
    sweetSpotTimeRef.current = bowlStartTimeRef.current + (duration * 0.72); // sweet spot at 72%

    const animate = (now: number) => {
      const elapsed = now - bowlStartTimeRef.current;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setBallProgress(progress);

      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ball passed without hit -> Dot or bowled
        handleShotExecution(999);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleHitBall = () => {
    if (!isBowling || !hitWindowActive) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const now = performance.now();
    const offsetMs = Math.round(now - sweetSpotTimeRef.current);
    handleShotExecution(offsetMs);
  };

  const handleShotExecution = (offsetMs: number) => {
    setIsBowling(false);
    setHitWindowActive(false);

    const delivery = deliveries[currentBallIdx];
    const shotRecord: ShotRecord = {
      ballNumber: currentBallIdx + 1,
      shotType: selectedShot,
      timingOffsetMs: offsetMs
    };

    const newShotsLog = [...shotsLog, shotRecord];
    setShotsLog(newShotsLog);

    // Calculate run outcome locally for responsive gameplay
    let runs = 0;
    let isWicket = false;
    let commentary = '';

    const absOffset = Math.abs(offsetMs);
    if (offsetMs > 500) {
      // Complete miss
      if (delivery.type === 'yorker' || delivery.type === 'bouncer') {
        isWicket = true;
        commentary = 'BOWLED HIM! Completely undone by the delivery!';
      } else {
        runs = 0;
        commentary = 'Played and missed. Dot ball.';
      }
    } else if (selectedShot === 'loft') {
      if (absOffset <= 40) {
        runs = 6;
        commentary = 'MASSIVE SIX! Launched way into the tier 2 stands!';
      } else if (absOffset <= 70) {
        runs = 4;
        commentary = 'FOUR RUNS! Lofted over mid-off with superb timing!';
      } else if (absOffset > 105) {
        isWicket = true;
        commentary = 'OUT! Caught in the deep attempting the big hit!';
      } else {
        runs = 1;
        commentary = 'Mis-hit drops safely into the gap for a single.';
      }
    } else if (selectedShot === 'defend') {
      runs = 0;
      commentary = 'Solid forward defensive block. No run.';
    } else {
      // Drive, Pull, Cut
      if (absOffset <= 35) {
        runs = 6;
        commentary = 'GLORIOUS SIX! Sweet strike over the boundary ropes!';
      } else if (absOffset <= 65) {
        runs = 4;
        commentary = 'CRACKING FOUR! Smacked through covers like a bullet!';
      } else if (absOffset <= 95) {
        runs = 2;
        commentary = 'Pushed into the gap, aggressive running for two!';
      } else if (absOffset <= 125) {
        runs = 1;
        commentary = 'Quick single taken.';
      } else {
        if (delivery.type === 'yorker') {
          isWicket = true;
          commentary = 'WICKET! Yorker crashes into off-stump!';
        } else {
          runs = 0;
          commentary = 'Beaten for pace. Dot ball.';
        }
      }
    }

    const newOutcome: BallOutcome = {
      ballNumber: currentBallIdx + 1,
      runs,
      isWicket,
      commentary
    };

    const updatedOutcomes = [...outcomes, newOutcome];
    const newTotal = totalScore + runs;
    setOutcomes(updatedOutcomes);
    setTotalScore(newTotal);

    if (isWicket) {
      setIsWicketOut(true);
      finishMatch(newTotal, true, updatedOutcomes, newShotsLog);
      return;
    }

    const nextBall = currentBallIdx + 1;
    if (nextBall >= 6) {
      finishMatch(newTotal, false, updatedOutcomes, newShotsLog);
    } else {
      setCurrentBallIdx(nextBall);
    }
  };

  const finishMatch = async (
    finalRuns: number,
    wicket: boolean,
    _outcomesList: BallOutcome[],
    finalShotsLog: ShotRecord[]
  ) => {
    setMatchOver(true);
    if (!sessionId || !sessionNonce) return;

    try {
      const verifyRes = await api.verifyArcadeReward(sessionId, sessionNonce, {
        shots: finalShotsLog
      });

      setServerMsg(verifyRes.message);
      if (verifyRes.won && verifyRes.creditAwarded > 0) {
        setCreditWon(true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.55 } });
        await refreshBalances();
      }
    } catch (err: any) {
      setServerMsg('Reward verification failed: ' + err.message);
    }
  };

  const currentDelivery = deliveries[currentBallIdx];

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
          onClick={initChallenge}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart Challenge</span>
        </button>
      </div>

      {/* Target & Rules Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-brand-darkPanel to-yellow-950/30 border border-amber-500/30 flex items-center justify-between shadow-glass">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Six-Ball Cricket Batting Challenge</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              TARGET: 25 RUNS
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            MANDATORY RULE: Score at least <strong>25 runs</strong> in 6 balls without getting out to win +1 GAAI Credit!
          </p>
        </div>
      </div>

      {/* Scoreboard Dashboard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-brand-darkPanel border border-brand-darkBorder text-center">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Runs</div>
          <div className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mt-1">
            {totalScore}
          </div>
          <div className="text-[10px] text-slate-500">Need 25+ to Win</div>
        </div>

        <div className="p-3.5 rounded-xl bg-brand-darkPanel border border-brand-darkBorder text-center">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Balls Bowled</div>
          <div className="text-3xl font-extrabold font-mono text-white mt-1">
            {outcomes.length} <span className="text-sm font-normal text-slate-500">/ 6</span>
          </div>
          <div className="text-[10px] text-slate-500">{6 - outcomes.length} balls remain</div>
        </div>

        <div className="p-3.5 rounded-xl bg-brand-darkPanel border border-brand-darkBorder text-center">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Wickets</div>
          <div className={`text-3xl font-extrabold font-mono mt-1 ${isWicketOut ? 'text-rose-500' : 'text-emerald-400'}`}>
            {isWicketOut ? '1 (OUT)' : '0'}
          </div>
          <div className="text-[10px] text-slate-500">1 wicket ends challenge</div>
        </div>
      </div>

      {/* Pitch & Visual Batting Arena */}
      <div className="relative rounded-2xl bg-[#0e1610] border border-emerald-900/40 p-6 overflow-hidden min-h-[220px] flex flex-col justify-between shadow-glow-violet">
        {/* Pitch markings */}
        <div className="absolute inset-x-12 inset-y-2 bg-[#2d3a2b]/30 border-x border-[#3e4f3a]/50 pointer-events-none">
          {/* Stumps bowler end */}
          <div className="absolute top-4 inset-x-0 mx-auto w-10 h-1.5 bg-amber-200/50 rounded-full"></div>
          {/* Popping crease & Stumps batsman end */}
          <div className="absolute bottom-10 inset-x-0 mx-auto w-24 h-0.5 bg-white/40"></div>
          <div className="absolute bottom-6 inset-x-0 mx-auto w-10 h-2 bg-amber-300/80 rounded-full"></div>
        </div>

        {/* Bowler status */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Ball {currentBallIdx + 1} Delivery:</span>
            {currentDelivery && (
              <span className="font-mono text-amber-300 font-bold uppercase">
                {currentDelivery.type} ({currentDelivery.speedKmph} km/h)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">Sweet Spot: 72% depth</span>
        </div>

        {/* Animated Cricket Ball */}
        <div className="relative z-10 w-full h-24 flex items-center justify-center">
          {isBowling ? (
            <div
              className="absolute w-6 h-6 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)] border border-white/60 transition-all duration-75"
              style={{
                top: `${ballProgress}%`,
                transform: `scale(${0.7 + (ballProgress / 100) * 0.7})`
              }}
            >
              <div className="w-full h-0.5 bg-white/60 mt-2.5"></div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400">
              {matchOver ? 'Match Concluded.' : 'Ready for delivery. Select your shot and hit "Bowl Delivery" below.'}
            </div>
          )}
        </div>

        {/* Hit Timing Indicator */}
        <div className="relative z-10 w-full bg-black/40 rounded-full h-3 border border-brand-darkBorder overflow-hidden">
          <div className="absolute left-[65%] w-[18%] h-full bg-emerald-500/50"></div>
          <div
            className="h-full bg-rose-500 transition-all duration-75"
            style={{ width: `${ballProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Batting Controls */}
      {!matchOver && (
        <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-3">
          <div className="text-xs font-semibold text-slate-300">Choose Batting Stroke:</div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'loft', label: 'Lofted Hit', desc: 'Sixes / High Risk' },
              { id: 'drive', label: 'Cover Drive', desc: 'Fours / Finesse' },
              { id: 'pull', label: 'Pull Shot', desc: 'vs Bouncers' },
              { id: 'cut', label: 'Late Cut', desc: 'Square boundaries' },
              { id: 'defend', label: 'Forward Defend', desc: 'Zero Risk / 0 Runs' }
            ].map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedShot(s.id as any)}
                disabled={isBowling}
                className={`p-2 rounded-xl text-center border transition ${
                  selectedShot === s.id
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-white/5 border-brand-darkBorder text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">{s.label}</div>
                <div className="text-[9px] text-slate-500">{s.desc}</div>
              </button>
            ))}
          </div>

          <div className="pt-2 flex gap-3">
            {!isBowling ? (
              <button
                onClick={handleStartDelivery}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition transform active:scale-95"
              >
                <Zap className="w-4 h-4" />
                <span>Bowl Ball {currentBallIdx + 1}</span>
              </button>
            ) : (
              <button
                onClick={handleHitBall}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-yellow-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-glow-violet animate-pulse transition transform active:scale-95"
              >
                🏏 HIT SHOT NOW!
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ball by Ball Over Log */}
      <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-2">
        <div className="text-xs font-semibold text-slate-300 mb-2">Over Tracker:</div>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const outcome = outcomes[idx];
            return (
              <div
                key={idx}
                className={`flex-1 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
                  outcome
                    ? outcome.isWicket
                      ? 'bg-rose-500/25 border-rose-500 text-rose-400'
                      : outcome.runs === 6
                      ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-sm'
                      : outcome.runs === 4
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white/5 border-dashed border-brand-darkBorder text-slate-600'
                }`}
              >
                {outcome ? (outcome.isWicket ? 'W' : outcome.runs) : `B${idx + 1}`}
              </div>
            );
          })}
        </div>

        {outcomes.length > 0 && (
          <p className="text-xs text-amber-300/90 italic pt-1">
            "{outcomes[outcomes.length - 1].commentary}"
          </p>
        )}
      </div>

      {/* Match Result Banner */}
      {matchOver && (
        <div className={`p-5 rounded-2xl text-center border animate-fadeIn ${
          creditWon
            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-glow-violet'
            : totalScore >= 25 && !isWicketOut
            ? 'bg-amber-950/40 border-amber-500 text-amber-200'
            : 'bg-rose-950/40 border-rose-500 text-rose-200'
        }`}>
          <div className="text-lg font-bold mb-1 flex items-center justify-center gap-2">
            {creditWon ? <Trophy className="w-6 h-6 text-amber-400" /> : <AlertTriangle className="w-5 h-5" />}
            {creditWon
              ? 'Target Achieved! +1 GAAI Credit Won!'
              : totalScore >= 25 && !isWicketOut
              ? 'Target Scored (Validating...)'
              : 'Target Missed! (Score < 25)'}
          </div>
          <p className="text-xs mb-4">
            {serverMsg || `You scored ${totalScore} runs. Minimum 25 runs required for credit grant.`}
          </p>
          <button
            onClick={initChallenge}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-xs shadow-glow-violet transition transform active:scale-95"
          >
            Face Challenge Again
          </button>
        </div>
      )}
    </div>
  );
};
