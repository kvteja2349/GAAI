import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import { useAuth } from '../../hooks/useAuth.js';
import { LocalStorageManager } from '../../lib/storage.js';
import { api } from '../../lib/api.js';
import {
  Settings,
  Sun,
  Moon,
  Trash2,
  Download,
  Upload,
  Database,
  Cpu,
  Volume2,
  Shield,
  Check,
  AlertTriangle
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [routingPref, setRoutingPref] = useState('balanced');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(s => {
      if (s.routing_preference) setRoutingPref(s.routing_preference);
      if (s.voice_enabled !== undefined) setVoiceEnabled(s.voice_enabled);
    }).catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    try {
      await api.updateSettings({
        routing_preference: routingPref,
        voice_enabled: voiceEnabled,
        theme
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e: any) {
      alert('Error updating settings: ' + e.message);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = LocalStorageManager.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaai_conversations_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const success = LocalStorageManager.importJSON(content);
      if (success) {
        setImportStatus('Conversations imported successfully! Reloading...');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setImportStatus('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAllHistory = () => {
    if (confirm('Are you absolutely sure you want to delete all local conversation history? This cannot be undone.')) {
      LocalStorageManager.deleteAll();
      alert('Local conversation history cleared.');
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-brand-darkBg transition-colors max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-brand-darkPanel border border-brand-darkBorder">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-violet" />
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize UI aesthetics, AI routing policies, local storage, and privacy controls.
        </p>
      </div>

      {/* Preferences Section */}
      <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          General & AI Preferences
        </h2>

        {/* Theme Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-darkBorder/60">
          <div>
            <div className="text-sm font-semibold text-slate-200">Interface Theme</div>
            <div className="text-xs text-slate-400">Choose between Premium Dark and Light mode</div>
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl border border-brand-darkBorder text-xs">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                theme === 'dark' ? 'bg-violet-600 text-white font-semibold shadow-glow-violet' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Theme</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                theme === 'light' ? 'bg-violet-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light Theme</span>
            </button>
          </div>
        </div>

        {/* AI Routing Policy */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-darkBorder/60">
          <div>
            <div className="text-sm font-semibold text-slate-200">AI Routing Strategy</div>
            <div className="text-xs text-slate-400">How GAAI auto-selects among configured models</div>
          </div>
          <select
            value={routingPref}
            onChange={(e) => setRoutingPref(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-brand-darkSurface border border-brand-darkBorder text-xs text-slate-200 focus:outline-none focus:border-brand-violet"
          >
            <option value="balanced">Balanced (Optimal Speed & Quality)</option>
            <option value="speed">Ultra-Low Latency First</option>
            <option value="quality">Deep Reasoning & Long Context First</option>
            <option value="local">Prefer Local Inference (Ollama)</option>
          </select>
        </div>

        {/* Voice Playback */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-brand-darkBorder/60">
          <div>
            <div className="text-sm font-semibold text-slate-200">Voice Synthesis (Read Aloud)</div>
            <div className="text-xs text-slate-400">Enable browser Web Speech API for AI answers</div>
          </div>
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
            className="w-4 h-4 accent-violet-600 cursor-pointer"
          />
        </div>

        <button
          onClick={handleSaveSettings}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-xs shadow-glow-violet transition flex items-center gap-1.5"
        >
          {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
          <span>{savedSuccess ? 'Preferences Saved!' : 'Save Preferences'}</span>
        </button>
      </div>

      {/* Local Storage & History Management */}
      <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-5">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Local Data & Privacy Management
        </h2>

        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 leading-relaxed">
          <strong className="text-emerald-200">Zero Cloud Leak Policy:</strong> All conversations, prompt history, and uploaded attachments are saved directly inside your browser's private storage by default. Clearing browser data will remove local chats unless exported.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportBackup}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-brand-darkBorder text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-brand-darkBorder text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4 text-violet-400" />
            <span>Import Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={handleDeleteAllHistory}
            className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Local History</span>
          </button>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-violet-900/30 border border-violet-700/40 text-xs text-violet-200">
            {importStatus}
          </div>
        )}
      </div>

      {/* Account Info */}
      {user && (
        <div className="p-6 rounded-2xl bg-brand-darkPanel border border-brand-darkBorder space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            Account Overview
          </h2>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div>
              <div className="font-semibold text-white">{user.display_name}</div>
              <div className="text-slate-400">{user.email} ({user.auth_provider})</div>
            </div>
            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
