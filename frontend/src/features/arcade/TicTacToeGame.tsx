import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { Trophy, RotateCcw, ArrowLeft, Coins, AlertCircle, Bot, User } from 'lucide-react';

interface MoveRecord {
  player: 'X' | 'O';
  cell: number;
  timestamp: number;
}

export const TicTacToeGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { refreshBalances } = useCredits();
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState<string | null>(null);
  const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [creditWon, setCreditWon] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const initGame = async () => {
    try {
      const session = await api.startArcadeSession('tictactoe');
      setSessionId(session.sessionId);
      setSessionNonce(session.sessionNonce);
      setBoard(Array(9).fill(null));
      setMoves([]);
      setWinner(null);
      setServerMsg(null);
      setCreditWon(false);
    } catch (e: any) {
      setServerMsg('Failed to initialize server session: ' + e.message);
    }
  };

  useEffect(() => {
    initGame();
  }, []);

  const checkLocalWinner = (b: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [x, y, z] of lines) {
      if (b[x] && b[x] === b[y] && b[x] === b[z]) {
        return b[x] as 'X' | 'O';
      }
    }
    if (b.every(c => c !== null)) return 'draw';
    return null;
  };

  const getBestAIMove = (currentBoard: (string | null)[]): number => {
    const available = currentBoard.map((c, i) => (c === null ? i : null)).filter(i => i !== null) as number[];
    if (available.length === 0) return -1;

    // Easy mode: random
    if (difficulty === 'easy' || (difficulty === 'medium' && Math.random() < 0.4)) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // Medium/Hard: check winning move for AI or block player
    for (const i of available) {
      const copy = [...currentBoard];
      copy[i] = 'O';
      if (checkLocalWinner(copy) === 'O') return i;
    }
    for (const i of available) {
      const copy = [...currentBoard];
      copy[i] = 'X';
      if (checkLocalWinner(copy) === 'X') return i;
    }
    // Take center if available
    if (available.includes(4)) return 4;
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || isVerifying || !sessionId || !sessionNonce) return;

    // Human move
    const newBoard = [...board];
    newBoard[index] = 'X';
    const humanMove: MoveRecord = { player: 'X', cell: index, timestamp: Date.now() };
    const newMoves = [...moves, humanMove];

    setBoard(newBoard);
    setMoves(newMoves);

    const winStatus = checkLocalWinner(newBoard);
    if (winStatus) {
      handleGameOver(winStatus, newMoves);
      return;
    }

    // AI move with natural slight delay
    setTimeout(() => {
      const aiIndex = getBestAIMove(newBoard);
      if (aiIndex >= 0) {
        newBoard[aiIndex] = 'O';
        const aiMove: MoveRecord = { player: 'O', cell: aiIndex, timestamp: Date.now() };
        const updatedMoves = [...newMoves, aiMove];
        setBoard(newBoard);
        setMoves(updatedMoves);

        const aiWinStatus = checkLocalWinner(newBoard);
        if (aiWinStatus) {
          handleGameOver(aiWinStatus, updatedMoves);
        }
      }
    }, 250);
  };

  const handleGameOver = async (res: 'X' | 'O' | 'draw', recordedMoves: MoveRecord[]) => {
    setWinner(res);
    if (!sessionId || !sessionNonce) return;

    setIsVerifying(true);
    try {
      const verifyRes = await api.verifyArcadeReward(sessionId, sessionNonce, {
        moves: recordedMoves
      });

      setServerMsg(verifyRes.message);
      if (verifyRes.won && verifyRes.creditAwarded > 0) {
        setCreditWon(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        await refreshBalances();
      }
    } catch (err: any) {
      setServerMsg('Reward verification error: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arcade</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">AI Difficulty:</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="px-2 py-1 bg-brand-darkPanel border border-brand-darkBorder rounded-lg text-xs text-slate-200"
          >
            <option value="easy">Casual (Easy)</option>
            <option value="medium">Standard (Medium)</option>
            <option value="hard">Grandmaster (Hard)</option>
          </select>
        </div>
      </div>

      {/* Game Title Card */}
      <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Tic-Tac-Toe
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Win for +1 Credit
            </span>
          </h2>
          <p className="text-xs text-slate-400">You are X. Defeat the AI to earn a verified server reward.</p>
        </div>
        <button
          onClick={initGame}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
          title="Restart match"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 3x3 Board */}
      <div className="aspect-square max-w-[340px] mx-auto grid grid-cols-3 gap-3 p-4 rounded-2xl bg-brand-darkSurface border border-brand-darkBorder shadow-glow-violet">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleCellClick(idx)}
            disabled={cell !== null || winner !== null || isVerifying}
            className={`rounded-xl flex items-center justify-center font-bold text-4xl font-mono transition transform active:scale-95 ${
              cell === 'X'
                ? 'bg-violet-600/25 border border-violet-500/40 text-violet-400 shadow-glow-violet'
                : cell === 'O'
                ? 'bg-cyan-600/25 border border-cyan-500/40 text-cyan-400 shadow-glow-cyan'
                : 'bg-brand-darkPanel/70 border border-brand-darkBorder hover:border-violet-500/50 hover:bg-white/5'
            }`}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Turn indicator */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-violet-400">
          <User className="w-3.5 h-3.5" />
          <span>You (X)</span>
        </div>
        <span>vs</span>
        <div className="flex items-center gap-1.5 font-medium text-cyan-400">
          <Bot className="w-3.5 h-3.5" />
          <span>AI (O)</span>
        </div>
      </div>

      {/* Outcome Banner */}
      {winner && (
        <div className={`p-4 rounded-2xl text-center border animate-fadeIn ${
          creditWon
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-glow-violet'
            : winner === 'X'
            ? 'bg-violet-950/40 border-violet-500/50 text-violet-200'
            : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}>
          <div className="font-bold text-base mb-1 flex items-center justify-center gap-2">
            {creditWon ? <Trophy className="w-5 h-5 text-amber-400" /> : <AlertCircle className="w-5 h-5" />}
            {winner === 'X' ? 'Victory!' : winner === 'O' ? 'AI Won!' : 'Match Draw'}
          </div>
          <p className="text-xs mb-3">
            {serverMsg || (winner === 'X' ? 'Validating victory on server...' : 'Draws and losses do not award credits.')}
          </p>

          <button
            onClick={initGame}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-xs shadow-glow-violet hover:opacity-90 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
