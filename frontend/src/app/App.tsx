import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '../hooks/useTheme.js';
import { AuthProvider } from '../hooks/useAuth.js';
import { CreditProvider } from '../hooks/useCredits.js';
import { Header } from '../components/Header.js';
import { Sidebar } from '../components/Sidebar.js';
import { CreditWalletModal } from '../features/credits/CreditWalletModal.js';
import { CreditOutModal } from '../features/credits/CreditOutModal.js';
import { AuthModal } from '../features/auth/AuthModal.js';

// Feature Views
import { ChatWorkspace } from '../features/chat/ChatWorkspace.js';
import { ArcadeHub } from '../features/arcade/ArcadeHub.js';
import { AIModelsView } from '../features/models/AIModelsView.js';
import { SettingsView } from '../features/settings/SettingsView.js';
import { AboutView } from '../features/about/AboutView.js';

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('');

  const navigate = useNavigate();

  const handleNewChat = () => {
    setActiveConversationId('');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-darkBg text-slate-100 font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onNewChat={handleNewChat}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <ChatWorkspace
                  conversationId={activeConversationId}
                  onSelectConversation={(id) => setActiveConversationId(id)}
                />
              }
            />
            <Route path="/arcade" element={<ArcadeHub />} />
            <Route path="/models" element={<AIModelsView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/about" element={<AboutView />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      <CreditWalletModal />
      <CreditOutModal />
      <AuthModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CreditProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </CreditProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
