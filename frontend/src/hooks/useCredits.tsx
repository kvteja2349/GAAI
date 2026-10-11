import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, CreditBalances, WalletData } from '../lib/api.js';
import { useAuth } from './useAuth.js';

interface CreditContextType {
  balances: CreditBalances | null;
  walletData: WalletData | null;
  isLoading: boolean;
  isWalletModalOpen: boolean;
  isCreditOutModalOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  openCreditOutModal: () => void;
  closeCreditOutModal: () => void;
  refreshBalances: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  claimDailyCredits: () => Promise<{ granted: boolean; message: string }>;
  timeUntilReset: string;
}

const CreditContext = createContext<CreditContextType>({
  balances: null,
  walletData: null,
  isLoading: true,
  isWalletModalOpen: false,
  isCreditOutModalOpen: false,
  openWalletModal: () => {},
  closeWalletModal: () => {},
  openCreditOutModal: () => {},
  closeCreditOutModal: () => {},
  refreshBalances: async () => {},
  refreshWallet: async () => {},
  claimDailyCredits: async () => ({ granted: false, message: '' }),
  timeUntilReset: '00:00:00'
});

export const CreditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<CreditBalances | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isCreditOutModalOpen, setIsCreditOutModalOpen] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('Calculating...');

  const refreshBalances = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getBalance();
      setBalances(data);
    } catch (e) {
      // ignore in offline/unauth
    }
  }, [user]);

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await api.getWallet();
      setWalletData(data);
      setBalances({
        total: data.total,
        welcome: data.welcome,
        daily: data.daily,
        game: data.game,
        adjustment: data.adjustment,
        nextResetTimestamp: data.nextResetTimestamp,
        nextResetIso: data.nextResetIso
      });
    } catch (e) {
      console.warn('[Credits] Failed to load wallet:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshBalances();
      refreshWallet();
    }
  }, [user, refreshBalances, refreshWallet]);

  // Update countdown to reset timer every second
  useEffect(() => {
    const updateCountdown = () => {
      if (!balances?.nextResetTimestamp) return;
      const now = Date.now();
      const diff = balances.nextResetTimestamp - now;
      if (diff <= 0) {
        setTimeUntilReset('Resetting now...');
        refreshBalances();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [balances?.nextResetTimestamp, refreshBalances]);

  const claimDailyCredits = async () => {
    const res = await api.claimDaily();
    await refreshWallet();
    return { granted: res.granted, message: res.message };
  };

  return (
    <CreditContext.Provider
      value={{
        balances,
        walletData,
        isLoading,
        isWalletModalOpen,
        isCreditOutModalOpen,
        openWalletModal: () => {
          refreshWallet();
          setIsWalletModalOpen(true);
        },
        closeWalletModal: () => setIsWalletModalOpen(false),
        openCreditOutModal: () => setIsCreditOutModalOpen(true),
        closeCreditOutModal: () => setIsCreditOutModalOpen(false),
        refreshBalances,
        refreshWallet,
        claimDailyCredits,
        timeUntilReset
      }}
    >
      {children}
    </CreditContext.Provider>
  );
};

export const useCredits = () => useContext(CreditContext);
