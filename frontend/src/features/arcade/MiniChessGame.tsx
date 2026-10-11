import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { Trophy, ArrowLeft, RotateCcw, AlertCircle, Bot, User } from 'lucide-react';

const PIECE_UNICODE: Record<string, string> = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

export const MiniChessGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { refreshBalances } = useCredits();
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [movesHistory, setMovesHistory] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState<string | null>(null);
  const [gameOverStatus, setGameOverStatus] = useState<string | null>(null);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [creditWon, setCreditWon] = useState(false);

  const initMatch = async () => {
    try {
      chess.reset();
      setFen(chess.fen());
      setSelectedSquare(null);
      setValidMoves([]);
      setMovesHistory([]);
      setGameOverStatus(null);
      setServerMsg(null);
      setCreditWon(false);

      const session = await api.startArcadeSession('chess');
      setSessionId(session.sessionId);
      setSessionNonce(session.sessionNonce);
    } catch (e: any) {
      setServerMsg('Failed to init chess session: ' + e.message);
    }
  };

  useEffect(() => {
    initMatch();
  }, []);

  const handleSquareClick = (square: string) => {
    if (gameOverStatus || chess.turn() !== 'w') return;

    if (selectedSquare) {
      // Try to make move
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q'
        });

        if (move) {
          const newHistory = [...movesHistory, move.san];
          setMovesHistory(newHistory);
          setFen(chess.fen());
          setSelectedSquare(null);
          setValidMoves([]);

          if (checkTerminalState(newHistory)) return;

          // AI turn (Black)
          setTimeout(() => {
            makeAIMove(newHistory);
          }, 350);
          return;
        }
      } catch {
        // Not a valid move
      }
    }

    // Select piece
    const piece = chess.get(square as any);
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as any, verbose: true });
      setValidMoves(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const makeAIMove = (currentHistory: string[]) => {
    if (chess.isGameOver()) return;

    const possibleMoves = chess.moves({ verbose: true });
    if (possibleMoves.length === 0) return;

    // AI selects capture or random legal move
    const captureMoves = possibleMoves.filter(m => m.captured);
    const chosenMove = captureMoves.length > 0
      ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
      : possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    const aiRes = chess.move(chosenMove);
    if (aiRes) {
      const updatedHistory = [...currentHistory, aiRes.san];
      setMovesHistory(updatedHistory);
      setFen(chess.fen());
      checkTerminalState(updatedHistory);
    }
  };

  const checkTerminalState = (history: string[]): boolean => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'b' ? 'Human (White)' : 'AI (Black)';
      setGameOverStatus(`Checkmate! Winner: ${winner}`);
      if (chess.turn() === 'b') {
        submitWinningReward(history);
      }
      return true;
    }

    if (chess.isDraw() || chess.isStalemate()) {
      setGameOverStatus('Draw / Stalemate. No credit awarded.');
      return true;
    }

    return false;
  };

  const submitWinningReward = async (history: string[]) => {
    if (!sessionId || !sessionNonce) return;

    try {
      const res = await api.verifyArcadeReward(sessionId, sessionNonce, {
        moves: history
      });

      setServerMsg(res.message);
      if (res.won && res.creditAwarded > 0) {
        setCreditWon(true);
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
        await refreshBalances();
      }
    } catch (e: any) {
      setServerMsg('Verification error: ' + e.message);
    }
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arcade</span>
        </button>

        <button
          onClick={initMatch}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
          title="Reset board"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Rules Banner */}
      <div className="p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Mini Chess
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Checkmate for +1 Credit
            </span>
          </h2>
          <p className="text-xs text-slate-400">Play as White. Checkmate the AI opponent to claim your credit.</p>
        </div>
      </div>

      {/* Chessboard */}
      <div className="aspect-square max-w-[380px] mx-auto rounded-2xl overflow-hidden border border-brand-darkBorder shadow-glow-violet bg-[#1f2233] p-2">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden">
          {ranks.map((rank, rIdx) =>
            files.map((file, fIdx) => {
              const square = `${file}${rank}`;
              const isDark = (rIdx + fIdx) % 2 === 1;
              const piece = chess.get(square as any);
              const isSelected = selectedSquare === square;
              const isValid = validMoves.includes(square);

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  className={`relative flex items-center justify-center cursor-pointer select-none text-2xl sm:text-3xl transition ${
                    isDark ? 'bg-[#2b2d42]' : 'bg-[#e0e1dd]'
                  } ${isSelected ? '!bg-amber-400/70' : ''}`}
                >
                  {isValid && (
                    <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500/80 z-10 animate-pulse"></div>
                  )}

                  {piece && (
                    <span
                      className={`font-serif leading-none ${
                        piece.color === 'w' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'
                      }`}
                    >
                      {PIECE_UNICODE[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs px-4 py-2.5 rounded-xl bg-brand-darkPanel border border-brand-darkBorder">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Turn:</span>
          <span className={`font-mono font-bold ${chess.turn() === 'w' ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {chess.turn() === 'w' ? 'Your Move (White)' : 'AI Thinking (Black)...'}
          </span>
        </div>
        <div className="text-slate-500 font-mono">
          {movesHistory.length} moves played
        </div>
      </div>

      {/* Game Over Banner */}
      {gameOverStatus && (
        <div className={`p-4 rounded-2xl text-center border animate-fadeIn ${
          creditWon
            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-glow-violet'
            : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}>
          <div className="font-bold text-base mb-1 flex items-center justify-center gap-2">
            {creditWon ? <Trophy className="w-5 h-5 text-amber-400" /> : <AlertCircle className="w-5 h-5" />}
            {gameOverStatus}
          </div>
          <p className="text-xs mb-3">{serverMsg || 'Game concluded.'}</p>
          <button
            onClick={initMatch}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-xs shadow-glow-violet transition"
          >
            Play Another Game
          </button>
        </div>
      )}
    </div>
  );
};
