import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: (email: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthModalOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: () => {},
  refreshUser: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const refreshUser = async () => {
    if (!api.getToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (e) {
      api.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If no token exists, auto-initialize demo user so user can immediately experience GAAI
    const token = api.getToken();
    if (!token) {
      // Auto register or login guest session for instant out-of-the-box delight
      api.register(`player_${Date.now()}@gaai.local`, 'GAAIPlayer2026!', 'GAAI Gamer')
        .then(res => {
          setUser(res.user);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      refreshUser();
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
    setIsAuthModalOpen(false);
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await api.register(email, pass, name);
    setUser(res.user);
    setIsAuthModalOpen(false);
  };

  const loginWithGoogle = async (email: string, name: string) => {
    const res = await api.loginWithGoogle(email, name);
    setUser(res.user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
