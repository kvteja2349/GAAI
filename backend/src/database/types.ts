export interface User {
  id: string;
  email: string;
  password_hash?: string;
  display_name: string;
  avatar_url?: string;
  auth_provider: 'email' | 'google';
  welcome_granted: boolean;
  created_at: string;
  updated_at: string;
}

export type CreditType = 'welcome' | 'daily' | 'game' | 'adjustment';
export type CreditCategory = 'grant' | 'debit' | 'refund';

export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  amount: number; // + or -
  credit_type: CreditType;
  category: CreditCategory;
  reason: string;
  idempotency_key: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DailyGrant {
  id: string;
  user_id: string;
  grant_date: string; // YYYY-MM-DD
  amount: number;
  created_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_type: 'tictactoe' | 'pool' | 'chess' | 'carrom' | 'cornhole' | 'cricket';
  session_nonce: string;
  status: 'active' | 'completed' | 'abandoned';
  state_data: Record<string, any>;
  won: boolean;
  reward_granted: boolean;
  score: number;
  created_at: string;
  completed_at?: string;
}

export interface GenerationReservation {
  id: string;
  user_id: string;
  status: 'reserved' | 'committed' | 'released';
  credits_reserved: number;
  lines_generated: number;
  model_id?: string;
  prompt_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: 'dark' | 'light';
  default_model: string;
  routing_preference: string;
  voice_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditBalances {
  total: number;
  welcome: number;
  daily: number;
  game: number;
  adjustment: number;
  nextResetTimestamp: number;
  nextResetIso: string;
}
