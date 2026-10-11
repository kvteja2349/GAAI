import React, { useState, useEffect } from 'react';
import { api, ModelCapability } from '../../lib/api.js';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  HardDrive,
  Globe,
  Zap,
  Code,
  Sparkles,
  Info
} from 'lucide-react';

export const AIModelsView: React.FC = () => {
  const [models, setModels] = useState<ModelCapability[]>([]);
  const [healthStatus, setHealthStatus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const loadData = async () => {
    setIsChecking(true);
    try {
      const [mRes, hRes] = await Promise.all([
        api.listModels(),
        api.getHealth()
      ]);
      setModels(mRes.models);
      setHealthStatus(hRes.health);
    } catch (e) {
      console.warn('Failed to fetch models:', e);
    } finally {
      setIsLoading(false);
      setIsChecking(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getProviderHealth = (providerId: string) => {
    return healthStatus.find(h => h.providerId === providerId);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-brand-darkBg transition-colors max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-brand-darkPanel border border-brand-darkBorder">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-brand-violet" />
              AI Model Router & Providers
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Smart multi-provider routing across free online tiers and local private inference servers.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isChecking}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-brand-darkBorder text-slate-200 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>Run Health Checks</span>
        </button>
      </div>

      {/* Provider Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'gemini', name: 'Google Gemini', type: 'Free Cloud Tier (15 RPM)', keyVar: 'GEMINI_API_KEY' },
          { id: 'groq', name: 'Groq Cloud', type: 'Free Llama 3.3 Ultra-Fast', keyVar: 'GROQ_API_KEY' },
          { id: 'ollama', name: 'Ollama Local', type: 'Offline Private Inference', keyVar: 'OLLAMA_BASE_URL' },
          { id: 'gaai-local', name: 'GAAI Embedded Core', type: 'Built-in Local Assist', keyVar: 'Always Active' }
        ].map((p) => {
          const health = getProviderHealth(p.id);
          const isHealthy = health?.isHealthy ?? (p.id === 'gaai-local');

          return (
            <div key={p.id} className="p-4 rounded-2xl bg-brand-darkPanel/70 border border-brand-darkBorder space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{p.name}</span>
                {isHealthy ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold" title={health?.error || 'Key not configured'}>
                    <XCircle className="w-3.5 h-3.5" />
                    Not Configured
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">{p.type}</div>
              <div className="text-[10px] font-mono text-slate-500 bg-black/30 p-1.5 rounded-lg truncate">
                {p.keyVar}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Guidance Card */}
      <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-cyan-300">
          <Info className="w-4 h-4" />
          <span>Configuring Real Free Tiers & Local AI</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          GAAI runs on a target budget of <strong>₹0/month</strong> using free-tier providers. To activate full generative capabilities:
        </p>
        <ul className="list-disc ml-5 space-y-1 text-slate-300">
          <li><strong>Google Gemini:</strong> Add your free API key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline text-cyan-400">Google AI Studio</a> to <code className="bg-black/40 px-1 py-0.5 rounded font-mono">backend/.env</code> as <code className="font-mono text-cyan-300">GEMINI_API_KEY</code>.</li>
          <li><strong>Groq Cloud:</strong> Free keys from <a href="https://console.groq.com/" target="_blank" rel="noreferrer" className="underline text-cyan-400">Groq Console</a> (Llama 3.3 70B inference at ~300 tokens/sec) set as <code className="font-mono text-cyan-300">GROQ_API_KEY</code>.</li>
          <li><strong>Local Ollama:</strong> Install Ollama locally and run <code className="font-mono text-cyan-300">ollama run llama3</code>. GAAI connects automatically to <code className="font-mono">http://localhost:11434/v1</code>!</li>
        </ul>
      </div>

      {/* Models Catalog Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Supported Model Catalog</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-mono">
            {models.length} Models
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder hover:border-violet-500/40 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {m.name}
                    {m.isLocal ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                        <HardDrive className="w-3 h-3" /> Local
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3" /> Cloud Free
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">{m.provider}</div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-violet-400">
                    {m.contextLength ? `${(m.contextLength / 1000).toFixed(0)}k ctx` : 'Standard'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {m.description}
              </p>

              {/* Capabilities & recommendations */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {m.capabilities.map((c, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-brand-darkBorder text-slate-300 uppercase font-mono">
                    {c}
                  </span>
                ))}
                {m.recommendedFor.map((r, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-600/15 border border-violet-500/30 text-violet-300 font-semibold">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
