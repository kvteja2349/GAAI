import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CanvasWorkspaceProps {
  initialContent: string;
  onClose: () => void;
  onExport: (format: 'txt' | 'md' | 'pdf') => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  initialContent,
  onClose,
  onExport
}) => {
  const [content, setContent] = useState(initialContent);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full lg:w-[450px] xl:w-[520px] h-full border-l border-brand-darkBorder bg-brand-darkSurface flex flex-col z-20 shadow-2xl transition-all">
      {/* Canvas Header */}
      <div className="flex items-center justify-between p-4 border-b border-brand-darkBorder bg-brand-darkPanel/50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-600/20 text-brand-cyan">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Canvas Workspace</h3>
            <p className="text-[10px] text-slate-400">Live document & code editor</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Tab buttons */}
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-brand-darkBorder text-[11px] mr-2">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-2.5 py-1 rounded transition ${
                activeTab === 'edit' ? 'bg-violet-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded transition ${
                activeTab === 'preview' ? 'bg-violet-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Preview
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            title="Close Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'edit' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-transparent text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed"
            placeholder="Type or paste document content here..."
          />
        ) : (
          <div className="markdown-body text-xs text-slate-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Canvas Footer (Actions & Export) */}
      <div className="p-3 border-t border-brand-darkBorder bg-brand-darkPanel/40 flex items-center justify-between text-xs">
        <span className="text-[10px] text-slate-500 font-mono">
          {content.split('\n').length} lines • {content.length} characters
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1 transition text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => onExport('md')}
            className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 flex items-center gap-1 transition text-[11px]"
            title="Download Markdown"
          >
            <Download className="w-3 h-3" />
            <span>Export MD</span>
          </button>

          <button
            onClick={() => onExport('txt')}
            className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition text-[11px]"
            title="Download Text"
          >
            <Download className="w-3 h-3" />
            <span>TXT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
