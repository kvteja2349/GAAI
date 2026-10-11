import React, { useState } from 'react';
import { api } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { Sparkles, X, Download, ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';

interface ImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({ isOpen, onClose }) => {
  const { refreshBalances } = useCredits();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const res = await api.generateImage(prompt.trim(), aspectRatio);
      setResultImage(res);
      await refreshBalances();
    } catch (err: any) {
      setError(err.message || 'Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage?.imageUrl) return;
    const a = document.createElement('a');
    a.href = resultImage.imageUrl;
    a.download = `gaai_image_${Date.now()}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-brand-darkSurface border border-brand-darkBorder rounded-2xl shadow-glow-violet overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-brand-darkBorder bg-gradient-to-r from-violet-950/40 to-cyan-950/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 text-brand-violet border border-violet-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Image Generation
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Flux.1 Engine • 1 Credit
                </span>
              </h2>
              <p className="text-xs text-slate-400">High-fidelity generative AI visualization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Image Description Prompt
              </label>
              <textarea
                rows={3}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic cyberpunk arcade in neon violet and cyan, sleek reflections, hyperrealistic 8k render..."
                className="w-full px-3.5 py-2.5 bg-brand-darkPanel border border-brand-darkBorder rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-brand-violet transition resize-none leading-relaxed"
              />
            </div>

            {/* Aspect Ratio picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['1:1', '16:9', '9:16', '4:3'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      aspectRatio === ratio
                        ? 'bg-violet-600/20 border-brand-violet text-brand-violet shadow-sm'
                        : 'bg-white/5 border-brand-darkBorder text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-glow-violet transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Image...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Image (1 Credit)</span>
                </>
              )}
            </button>
          </form>

          {/* Generated Image Result */}
          {resultImage && (
            <div className="mt-4 p-4 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Result ({resultImage.width}x{resultImage.height})</span>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 flex items-center gap-1.5 transition text-[11px] font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download High-Res
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-brand-darkBorder/60 bg-black/40 flex items-center justify-center min-h-[300px]">
                <img
                  src={resultImage.imageUrl}
                  alt={resultImage.prompt}
                  className="w-full h-auto max-h-[420px] object-contain rounded-lg"
                  loading="lazy"
                />
              </div>

              <p className="text-[11px] text-slate-400 italic">"{resultImage.prompt}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
