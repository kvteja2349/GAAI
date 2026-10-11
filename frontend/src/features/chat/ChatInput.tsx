import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Globe,
  X,
  FileText,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { ChatAttachment } from '../../lib/storage.js';
import { api, ModelCapability } from '../../lib/api.js';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: ChatAttachment[], webSearch: boolean, modelId?: string) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  models: ModelCapability[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  models,
  selectedModelId,
  onSelectModel
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText(prev => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 5MB size limit.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const content = reader.result as string;
        try {
          // Parse on server to extract text safely
          const parsed = await api.parseFile(file.name, content, false, file.size);
          setAttachments(prev => [
            ...prev,
            {
              name: file.name,
              extension: parsed.extension,
              size: file.size,
              extractedText: parsed.extractedText
            }
          ]);
        } catch (err: any) {
          alert(`Failed to parse ${file.name}: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(text.trim(), attachments, webSearchEnabled, selectedModelId);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const activeModelName = selectedModelId === 'auto'
    ? 'Auto Router (Smart)'
    : models.find(m => m.id === selectedModelId)?.name || selectedModelId;

  return (
    <div className="relative border-t border-brand-darkBorder glass-panel p-4 pb-6 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Attached Files List */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/40 border border-violet-800/40 text-xs text-violet-300"
              >
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                <span className="font-mono">{file.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="p-0.5 hover:text-white rounded hover:bg-white/10 transition"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Card */}
        <div className="relative rounded-2xl bg-brand-darkPanel border border-brand-darkBorder focus-within:border-brand-violet transition shadow-glass">
          {/* Top Options Bar (Model selector, Web search toggle, Voice indicator) */}
          <div className="flex items-center justify-between px-3 pt-2 text-xs border-b border-brand-darkBorder/40">
            {/* Model Selector dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-medium transition"
              >
                <Sparkles className="w-3 h-3 text-brand-violet" />
                <span className="truncate max-w-[160px]">{activeModelName}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-64 max-h-60 overflow-y-auto bg-brand-darkSurface border border-brand-darkBorder rounded-xl shadow-glow-violet z-30 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => { onSelectModel('auto'); setIsModelDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedModelId === 'auto' ? 'bg-violet-600/20 text-brand-violet font-semibold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div>Auto Router (Smart Selection)</div>
                    <div className="text-[10px] text-slate-500">Chooses best model based on task</div>
                  </button>
                  {models.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { onSelectModel(m.id); setIsModelDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedModelId === m.id ? 'bg-violet-600/20 text-brand-violet font-semibold' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{m.name}</span>
                        {m.isLocal && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Local</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{m.provider} • {m.contextLength ? `${(m.contextLength/1000).toFixed(0)}k ctx` : ''}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Web Search Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  webSearchEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                title="Toggle Live Web Search with DuckDuckGo"
              >
                <Globe className={`w-3 h-3 ${webSearchEnabled ? 'text-cyan-400' : ''}`} />
                <span>Web Search</span>
                {webSearchEnabled && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
              </button>

              {isRecording && (
                <span className="flex items-center gap-1 text-[11px] text-rose-400 font-mono animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Listening...
                </span>
              )}
            </div>
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Listening to speech...' : 'Ask GAAI anything (code, research, analysis, essays)... Press Enter to send'}
            className="w-full px-4 py-3 bg-transparent text-slate-100 placeholder:text-slate-500 text-sm resize-none focus:outline-none leading-relaxed"
          />

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-brand-darkBorder/40">
            <div className="flex items-center space-x-1.5">
              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.sql,.pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
                title="Add Files (TXT, MD, PDF, DOCX, CSV, JSON, Code)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Voice Input Mic Button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2 rounded-xl transition ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={isRecording ? 'Stop Recording' : 'Voice Input (Speech-to-Text)'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Send or Stop streaming Button */}
            <div>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() && attachments.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-glow-violet transition transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  title="Send message (1 credit per 500 lines)"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
          <span>GAAI Credit System: 1 Credit authorizes up to 500 generated lines</span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
};
