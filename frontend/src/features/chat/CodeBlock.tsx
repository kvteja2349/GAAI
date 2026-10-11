import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = language || 'txt';
    a.download = `code_export_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-brand-darkBorder bg-[#0d0f18] text-slate-200 text-xs font-mono">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#141624] border-b border-brand-darkBorder text-[11px] text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-violet-400">
          {language || 'code'}
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition"
            title="Download Code File"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
};
