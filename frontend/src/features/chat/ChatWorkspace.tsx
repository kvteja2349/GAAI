import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  LocalStorageManager,
  Conversation,
  ChatMessageItem,
  ChatAttachment
} from '../../lib/storage.js';
import { api, ModelCapability } from '../../lib/api.js';
import { useCredits } from '../../hooks/useCredits.js';
import { MessageItem } from './MessageItem.js';
import { ChatInput } from './ChatInput.js';
import { CanvasWorkspace } from './CanvasWorkspace.js';
import { ImageGeneratorModal } from './ImageGeneratorModal.js';
import {
  Sparkles,
  Download,
  Trash2,
  Edit2,
  PanelRightOpen,
  PanelRightClose,
  ImageIcon,
  Bot,
  Zap
} from 'lucide-react';

interface ChatWorkspaceProps {
  conversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  conversationId,
  onSelectConversation
}) => {
  const { refreshBalances, openCreditOutModal } = useCredits();
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [models, setModels] = useState<ModelCapability[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('auto');
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  // Load models catalog
  useEffect(() => {
    api.listModels().then(res => setModels(res.models)).catch(() => {});
  }, []);

  // Load active conversation or create new
  useEffect(() => {
    if (conversationId) {
      const conv = LocalStorageManager.getConversation(conversationId);
      if (conv) {
        setCurrentConversation(conv);
        setMessages(conv.messages);
        setSelectedModelId(conv.modelId || 'auto');
        setTitleInput(conv.title);
        return;
      }
    }

    // Default: initialize an empty in-memory session. We deliberately do NOT
    // notify the parent here: lifting a freshly generated id up would change
    // `conversationId`, re-run this effect, and create a new id every render
    // (infinite render loop that also wipes streamed messages).
    const newConv: Conversation = {
      id: uuidv4(),
      title: 'New GAAI Session',
      messages: [],
      pinned: false,
      modelId: 'auto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCurrentConversation(newConv);
    setMessages([]);
    setTitleInput(newConv.title);
  }, [conversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (
    text: string,
    attachments: ChatAttachment[],
    webSearch: boolean,
    modelId?: string
  ) => {
    if (!currentConversation) return;

    // 1. Build user message
    const userMsg: ChatMessageItem = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    // 2. Prepare assistant placeholder
    const assistantMsgId = uuidv4();
    const assistantMsg: ChatMessageItem = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg, assistantMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);

    // Save prompt text as conversation title if this is the first turn
    let newTitle = currentConversation.title;
    if (messages.length === 0 && text) {
      newTitle = text.slice(0, 36) + (text.length > 36 ? '...' : '');
      setTitleInput(newTitle);
    }

    // Convert messages for API call
    const apiMessages = [...messages, userMsg].map(m => {
      let content = m.content;
      if (m.attachments && m.attachments.length > 0) {
        const fileContext = m.attachments.map(f => `--- FILE: ${f.name} ---\n${f.extractedText}\n--- END FILE ---`).join('\n\n');
        content = `${fileContext}\n\n${content}`;
      }
      return {
        role: m.role,
        content
      };
    });

    let accumulatedContent = '';

    const stopFn = await api.streamChat(
      apiMessages,
      modelId || selectedModelId,
      webSearch,
      (delta: string) => {
        accumulatedContent += delta;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
          )
        );
      },
      (doneData) => {
        setIsStreaming(false);
        const finalMessages = updatedMessages.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: accumulatedContent,
                modelUsed: doneData.modelUsed,
                lines: doneData.linesGenerated,
                creditsCharged: doneData.creditsCharged,
                citations: doneData.citations
              }
            : m
        );
        setMessages(finalMessages);

        // Persist to local storage
        const savedConv: Conversation = {
          ...currentConversation,
          title: newTitle,
          messages: finalMessages,
          modelId: modelId || selectedModelId,
          updatedAt: new Date().toISOString()
        };
        LocalStorageManager.saveConversation(savedConv);
        setCurrentConversation(savedConv);
        refreshBalances();
      },
      (err) => {
        setIsStreaming(false);
        if (err.isCreditError) {
          openCreditOutModal();
          accumulatedContent += `\n\n---\n⚠️ **You're out of credits.** Open the [Arcade](/arcade) to earn credits for free!`;
        } else {
          accumulatedContent += `\n\n*(Error: ${err.message})*`;
        }
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
          )
        );
      }
    );

    stopStreamRef.current = stopFn;
  };

  const handleStopStreaming = () => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
    }
    setIsStreaming(false);
    refreshBalances();
  };

  const handleSaveTitle = () => {
    if (!currentConversation) return;
    const updated = { ...currentConversation, title: titleInput.trim() || 'Untitled Session' };
    LocalStorageManager.saveConversation(updated);
    setCurrentConversation(updated);
    setIsEditingTitle(false);
  };

  const handleExport = (format: 'txt' | 'md' | 'pdf') => {
    if (!currentConversation) return;
    const title = currentConversation.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    let output = `# ${currentConversation.title}\n\n`;
    currentConversation.messages.forEach(m => {
      output += `### ${m.role === 'assistant' ? 'GAAI' : 'User'} (${new Date(m.timestamp).toLocaleString()}):\n${m.content}\n\n`;
    });

    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.${format === 'pdf' ? 'txt' : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteCurrentChat = () => {
    if (!currentConversation) return;
    if (confirm('Delete this conversation? All local records for this session will be removed.')) {
      LocalStorageManager.deleteConversation(currentConversation.id);
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
      {/* Main Chat Flow */}
      <div className="flex-1 flex flex-col min-w-0 bg-brand-darkBg transition-colors">
        {/* Chat Top Subheader */}
        <div className="h-12 px-4 md:px-6 border-b border-brand-darkBorder/60 glass-panel flex items-center justify-between text-xs z-10">
          <div className="flex items-center space-x-2 truncate">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="px-2 py-0.5 rounded bg-brand-darkPanel border border-brand-violet text-white text-xs"
                />
              </div>
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white font-medium truncate group"
                title="Click to rename"
              >
                <span className="truncate">{currentConversation?.title || 'Chat Workspace'}</span>
                <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-violet-400 shrink-0" />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Image Generator Modal trigger */}
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-brand-darkBorder flex items-center gap-1.5 transition text-[11px]"
              title="Generate AI Images (1 Credit)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-brand-violet" />
              <span className="hidden sm:inline">Image Gen</span>
            </button>

            {/* Document Canvas toggle */}
            <button
              onClick={() => setIsCanvasOpen(!isCanvasOpen)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 transition ${
                isCanvasOpen
                  ? 'bg-violet-600/20 text-brand-violet border-violet-500/40'
                  : 'bg-white/5 text-slate-300 hover:text-white border-brand-darkBorder'
              }`}
              title="Toggle Canvas Workspace"
            >
              {isCanvasOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Canvas</span>
            </button>

            {/* Export Dropdown */}
            <button
              onClick={() => handleExport('md')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              title="Export Conversation as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Delete Chat */}
            <button
              onClick={handleDeleteCurrentChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition"
              title="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Stream Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-500 p-0.5 shadow-glow-violet animate-bounce">
                <div className="w-full h-full bg-brand-darkSurface rounded-[22px] flex items-center justify-center text-white">
                  <Bot className="w-8 h-8 text-cyan-400" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">GAAI</span>
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  A multipurpose Gaming AI platform for coding, deep research, mathematical reasoning, essays, and arcade rewards.
                </p>
              </div>

              {/* Quick Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
                <button
                  onClick={() => handleSendMessage("Write a high-performance TypeScript WebSocket state machine for a multiplayer game.", [], false)}
                  className="p-3.5 rounded-xl bg-brand-darkPanel border border-brand-darkBorder hover:border-violet-500/50 hover:bg-white/5 transition text-xs text-slate-300 group"
                >
                  <div className="font-semibold text-white mb-1 flex items-center gap-1.5 text-violet-300">
                    <Zap className="w-3.5 h-3.5" />
                    Multiplayer State Machine
                  </div>
                  <p className="text-[11px] text-slate-400">TypeScript clean code architecture with line-by-line typing.</p>
                </button>

                <button
                  onClick={() => handleSendMessage("Explain how the GAAI 6-game arcade validation and 500-line credit limit operate.", [], false)}
                  className="p-3.5 rounded-xl bg-brand-darkPanel border border-brand-darkBorder hover:border-cyan-500/50 hover:bg-white/5 transition text-xs text-slate-300 group"
                >
                  <div className="font-semibold text-white mb-1 flex items-center gap-1.5 text-cyan-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Credits & Arcade Guide
                  </div>
                  <p className="text-[11px] text-slate-400">Learn about welcome credits, daily resets, and the cricket challenge.</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((m) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  onRetry={m.role === 'user' ? () => handleSendMessage(m.content, m.attachments || [], false) : undefined}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
        />
      </div>

      {/* Side Canvas Workspace */}
      {isCanvasOpen && (
        <CanvasWorkspace
          initialContent={messages.filter(m => m.role === 'assistant').pop()?.content || '# GAAI Document Workspace\n\nStart typing or generating content...'}
          onClose={() => setIsCanvasOpen(false)}
          onExport={handleExport}
        />
      )}

      {/* Image Generator Modal */}
      <ImageGeneratorModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
      />
    </div>
  );
};
