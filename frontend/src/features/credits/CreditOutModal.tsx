import React from 'react';
import { useCredits } from '../../hooks/useCredits.js';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Gamepad2, X } from 'lucide-react';

export const CreditOutModal: React.FC = () => {
  const { isCreditOutModalOpen, closeCreditOutModal } = useCredits();
  const navigate = useNavigate();

  if (!isCreditOutModalOpen) return null;

  const handleOpenArcade = () => {
    closeCreditOutModal();
    navigate('/arcade');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-brand-darkSurface border border-rose-500/40 rounded-2xl shadow-glow-violet p-6 text-center">
        <button
          onClick={closeCreditOutModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-2">
          You're out of credits.
        </h3>

        <p className="text-sm text-slate-400 mb-6">
          Each credit authorizes up to 500 generated output lines. Jump into the GAAI Arcade and win any game to earn free credits instantly!
        </p>

        <div className="space-y-3">
          <button
            onClick={handleOpenArcade}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow-violet transition transform active:scale-95"
          >
            <Gamepad2 className="w-5 h-5" />
            Open Arcade & Win Credits
          </button>

          <button
            onClick={closeCreditOutModal}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-xs transition"
          >
            Close & Review Chat
          </button>
        </div>
      </div>
    </div>
  );
};
