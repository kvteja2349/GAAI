import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Gamepad2,
  Cpu,
  Settings,
  Info,
  Clock,
  Trash2,
  Pin,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { LocalStorageManager, Conversation } from '../lib/storage.js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  activeConversationId,
  onSelectConversation,
  onNewChat
}) => {
  const navigate = useNavigate();
  const conversations = LocalStorageManager.getConversations();

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
    navigate('/');
    if (window.innerWidth < 768) onClose();
  };

  const handleSelect = (id: string) => {
    if (onSelectConversation) {
      onSelectConversation(id);
    }
    navigate('/');
    if (window.innerWidth < 768) onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    LocalStorageManager.deleteConversation(id);
    if (onSelectConversation && activeConversationId === id) {
      onSelectConversation('');
    }
  };

  const navItems = [
    { label: 'Chat', path: '/', icon: MessageSquare },
    { label: 'Arcade (Earn Credits)', path: '/arcade', icon: Gamepad2, highlight: true },
    { label: 'AI Models', path: '/models', icon: Cpu },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'About GAAI', path: '/about', icon: Info },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-brand-darkSurface border-r border-brand-darkBorder transition-all duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Top: New Chat button */}
        <div className="p-3 border-b border-brand-darkBorder">
          <button
            onClick={handleNewChat}
            className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-glow-violet transition transform active:scale-95 ${
              collapsed ? 'px-0' : ''
            }`}
            title="Start New Chat"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Primary Navigation Links */}
        <div className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => { if (window.innerWidth < 768) onClose(); }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-violet-600/20 text-brand-violet border border-violet-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-cyan-400' : ''}`} />
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.highlight && (
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded-full font-bold">
                        PLAY
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Chat History section */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto px-2 py-3 border-t border-brand-darkBorder">
            <div className="flex items-center justify-between px-2 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Local History
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Private</span>
            </div>

            {conversations.length > 0 ? (
              <div className="space-y-1">
                {conversations.map((c) => {
                  const isActive = activeConversationId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelect(c.id)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition ${
                        isActive
                          ? 'bg-white/10 text-white font-medium border border-white/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {c.pinned ? <Pin className="w-3 h-3 text-amber-400 shrink-0" /> : <MessageSquare className="w-3 h-3 shrink-0 text-slate-500" />}
                        <span className="truncate">{c.title || 'Untitled Chat'}</span>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded transition"
                        title="Delete Conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-[11px] text-slate-500">
                No conversations yet. Start typing to create your first session!
              </div>
            )}
          </div>
        )}

        {/* Bottom Collapse Toggle & Data Storage policy pill */}
        <div className="p-2 border-t border-brand-darkBorder flex items-center justify-between text-xs text-slate-500">
          {!collapsed && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 px-2" title="Private local storage">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Browser-stored</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 hidden md:block transition mx-auto md:mx-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
