import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessageItem } from '../../lib/storage.js';
import { CodeBlock } from './CodeBlock.js';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  FileText,
  Globe,
  ExternalLink,
  Cpu,
  Coins,
  Bot,
  User as UserIcon,
  RotateCcw
} from 'lucide-react';

interface MessageItemProps {
  message: ChatMessageItem;
  onRetry?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry }) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip code blocks and markdown symbols for clean, natural speech
    const cleanText = message.content
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*_~]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`group flex items-start gap-3.5 p-4 rounded-2xl transition ${
        isAssistant
          ? 'bg-brand-darkPanel/50 border border-brand-darkBorder/70 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm ${
          isAssistant
            ? 'bg-gradient-to-tr from-violet-600 to-cyan-500 shadow-glow-violet'
            : 'bg-slate-700'
        }`}
      >
        {isAssistant ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        {/* Header Meta info */}
        <div className="flex items-center justify-between mb-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {isAssistant ? 'GAAI Assistant' : 'You'}
            </span>
            {message.modelUsed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1 font-mono">
                <Cpu className="w-3 h-3 text-violet-400" />
                {message.modelUsed}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Attached Files chip */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300 font-mono"
              >
                <FileText className="w-3 h-3 text-cyan-400" />
                <span>{file.name}</span>
                <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
          </div>
        )}

        {/* Markdown Rendered Content */}
        <div className="text-sm text-slate-200 leading-relaxed overflow-x-auto markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                if (!inline && match) {
                  return <CodeBlock language={match[1]} value={codeString} />;
                }
                return (
                  <code
                    className="px-1.5 py-0.5 rounded bg-violet-950/50 text-violet-300 border border-violet-800/40 font-mono text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Web Search Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-brand-darkBorder/50">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>Retrieved Web Sources</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.citations.map((cite, i) => (
                <a
                  key={i}
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-brand-darkBorder text-[11px] text-slate-300 flex items-center justify-between group transition"
                >
                  <span className="truncate pr-2">{cite.title || cite.url}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions & Line Usage Indicators */}
        <div className="flex items-center justify-between mt-3 pt-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="hover:text-white flex items-center gap-1 transition"
              title="Copy Message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {isAssistant && (
              <button
                onClick={handleToggleSpeech}
                className="hover:text-white flex items-center gap-1 transition"
                title={isSpeaking ? 'Stop Voice Playback' : 'Read Aloud'}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isSpeaking ? 'Stop' : 'Read Aloud'}</span>
              </button>
            )}

            {!isAssistant && onRetry && (
              <button
                onClick={onRetry}
                className="hover:text-white flex items-center gap-1 transition"
                title="Regenerate from this message"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Regenerate</span>
              </button>
            )}
          </div>

          {/* Usage details (Lines generated & Credits deducted) */}
          {isAssistant && message.lines !== undefined && (
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
              <span>{message.lines} lines</span>
              <span>•</span>
              <span className="text-violet-400 font-semibold flex items-center gap-0.5">
                <Coins className="w-3 h-3" />
                {message.creditsCharged ?? 1} credit
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
