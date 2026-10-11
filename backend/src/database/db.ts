import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  User,
  CreditLedgerEntry,
  DailyGrant,
  GameSession,
  GenerationReservation,
  UserSettings,
  CreditBalances
} from './types.js';

interface DatabaseData {
  users: User[];
  credit_ledger: CreditLedgerEntry[];
  daily_grants: DailyGrant[];
  game_sessions: GameSession[];
  generation_reservations: GenerationReservation[];
  user_settings: UserSettings[];
}

class DatabaseManager {
  private localFilePath: string;
  private memoryData: DatabaseData;
  private supabase: SupabaseClient | null = null;
  private useSupabase: boolean = false;
  private defaultTimezone = process.env.DAILY_RESET_TIMEZONE || 'Asia/Kolkata';

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        // fallback to temp or current dir
      }
    }
    this.localFilePath = path.join(dataDir, 'gaai_store.json');
    this.memoryData = this.loadLocalData();

    // Check Supabase config
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.useSupabase = true;
      } catch (err) {
        console.warn('[DB] Supabase initialization failed, falling back to local file storage:', err);
        this.useSupabase = false;
      }
    }
  }

  private loadLocalData(): DatabaseData {
    const defaultData: DatabaseData = {
      users: [],
      credit_ledger: [],
      daily_grants: [],
      game_sessions: [],
      generation_reservations: [],
      user_settings: []
    };

    if (fs.existsSync(this.localFilePath)) {
      try {
        const raw = fs.readFileSync(this.localFilePath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('[DB] Failed reading local store, initializing fresh data', e);
      }
    }

    try {
      fs.writeFileSync(this.localFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
    } catch {
      // ignored if readonly
    }
    return defaultData;
  }

  private saveLocalData(): void {
    try {
      fs.writeFileSync(this.localFilePath, JSON.stringify(this.memoryData, null, 2), 'utf8');
    } catch (e) {
      console.error('[DB] Failed saving local store', e);
    }
  }

  // --- Date & Timezone utilities ---
  public getTodayDate(timezone: string = this.defaultTimezone): string {
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(now); // returns YYYY-MM-DD
    } catch {
      return now.toISOString().slice(0, 10);
    }
  }

  public getNextResetInfo(timezone: string = this.defaultTimezone): { timestamp: number; iso: string } {
    const now = new Date();
    const today = this.getTodayDate(timezone);
    // Midnight next day in target timezone
    const [year, month, day] = today.split('-').map(Number);
    // Tomorrow at 00:00:00
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
    // Offset correction for Asia/Kolkata (+5:30)
    // IST is UTC+5:30 -> midnight IST is 18:30 UTC previous day
    // Tomorrow midnight IST is tomorrow 00:00 IST = (tomorrow date - 5h30m) UTC
    const istMidnightUtc = new Date(Date.UTC(year, month - 1, day + 1, -5, -30, 0));
    const timestamp = istMidnightUtc.getTime();
    return {
      timestamp,
      iso: istMidnightUtc.toISOString()
    };
  }

  // --- Users ---
  public async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase.from('users').insert(newUser).select().single();
      if (!error && data) return data as User;
    }

    this.memoryData.users.push(newUser);
    this.saveLocalData();
    return newUser;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
      if (!error && data) return data as User;
    }
    const found = this.memoryData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return found || null;
  }

  public async getUserById(id: string): Promise<User | null> {
    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase.from('users').select('*').eq('id', id).single();
      if (!error && data) return data as User;
    }
    const found = this.memoryData.users.find(u => u.id === id);
    return found || null;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    const updated = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase.from('users').update(updates).eq('id', id).select().single();
      if (!error && data) return data as User;
    }

    const index = this.memoryData.users.findIndex(u => u.id === id);
    if (index >= 0) {
      this.memoryData.users[index] = updated;
      this.saveLocalData();
    }
    return updated;
  }

  // --- Credit Ledger & Grants ---
  public async addLedgerEntry(entry: Omit<CreditLedgerEntry, 'id' | 'created_at'>): Promise<CreditLedgerEntry | null> {
    // Idempotency check: if entry with this idempotency_key exists, return existing (prevent double grant)
    const existing = this.memoryData.credit_ledger.find(l => l.idempotency_key === entry.idempotency_key);
    if (existing) {
      return existing;
    }

    const newEntry: CreditLedgerEntry = {
      ...entry,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };

    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase.from('credit_ledger').insert(newEntry).select().single();
      if (!error && data) return data as CreditLedgerEntry;
    }

    this.memoryData.credit_ledger.push(newEntry);
    this.saveLocalData();
    return newEntry;
  }

  public async getBalances(userId: string): Promise<CreditBalances> {
    let entries: CreditLedgerEntry[] = [];
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase.from('credit_ledger').select('*').eq('user_id', userId);
      if (data) entries = data as CreditLedgerEntry[];
    } else {
      entries = this.memoryData.credit_ledger.filter(l => l.user_id === userId);
    }

    let welcome = 0;
    let daily = 0;
    let game = 0;
    let adjustment = 0;
    let totalDebits = 0;

    for (const e of entries) {
      if (e.amount > 0) {
        if (e.credit_type === 'welcome') welcome += e.amount;
        else if (e.credit_type === 'daily') daily += e.amount;
        else if (e.credit_type === 'game') game += e.amount;
        else if (e.credit_type === 'adjustment') adjustment += e.amount;
      } else {
        totalDebits += Math.abs(e.amount);
      }
    }

    // Debits deduct first from daily credits, then welcome, then game credits
    let remainingDebits = totalDebits;
    const spendableDaily = Math.max(0, daily - remainingDebits);
    remainingDebits = Math.max(0, remainingDebits - daily);

    const spendableWelcome = Math.max(0, welcome - remainingDebits);
    remainingDebits = Math.max(0, remainingDebits - welcome);

    const spendableGame = Math.max(0, game - remainingDebits);

    const totalSpendable = spendableDaily + spendableWelcome + spendableGame + adjustment;
    const resetInfo = this.getNextResetInfo();

    return {
      total: Math.max(0, totalSpendable),
      welcome: spendableWelcome,
      daily: spendableDaily,
      game: spendableGame,
      adjustment,
      nextResetTimestamp: resetInfo.timestamp,
      nextResetIso: resetInfo.iso
    };
  }

  public async getTransactions(userId: string, limit: number = 50): Promise<CreditLedgerEntry[]> {
    if (this.useSupabase && this.supabase) {
      const { data } = await this.supabase
        .from('credit_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (data) return data as CreditLedgerEntry[];
    }

    return this.memoryData.credit_ledger
      .filter(l => l.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  // --- Daily Grant Processing ---
  public async grantDailyCreditsIfEligible(userId: string): Promise<boolean> {
    const today = this.getTodayDate();
    const existingGrant = this.memoryData.daily_grants.find(
      g => g.user_id === userId && g.grant_date === today
    );

    if (existingGrant) {
      return false; // Already granted today
    }

    const grantRecord: DailyGrant = {
      id: uuidv4(),
      user_id: userId,
      grant_date: today,
      amount: 5,
      created_at: new Date().toISOString()
    };

    const idempotencyKey = `daily_grant_${userId}_${today}`;
    await this.addLedgerEntry({
      user_id: userId,
      amount: 5,
      credit_type: 'daily',
      category: 'grant',
      reason: `Daily grant for ${today}`,
      idempotency_key: idempotencyKey,
      metadata: { grant_date: today }
    });

    this.memoryData.daily_grants.push(grantRecord);
    this.saveLocalData();
    return true;
  }

  // --- Game Sessions ---
  public async createGameSession(
    userId: string,
    gameType: GameSession['game_type'],
    sessionNonce: string,
    stateData: Record<string, any> = {}
  ): Promise<GameSession> {
    const session: GameSession = {
      id: uuidv4(),
      user_id: userId,
      game_type: gameType,
      session_nonce: sessionNonce,
      status: 'active',
      state_data: stateData,
      won: false,
      reward_granted: false,
      score: 0,
      created_at: new Date().toISOString()
    };

    if (this.useSupabase && this.supabase) {
      const { data, error } = await this.supabase.from('game_sessions').insert(session).select().single();
      if (!error && data) return data as GameSession;
    }

    this.memoryData.game_sessions.push(session);
    this.saveLocalData();
    return session;
  }

  public async getGameSession(sessionId: string, nonce?: string): Promise<GameSession | null> {
    const session = this.memoryData.game_sessions.find(
      s => s.id === sessionId && (!nonce || s.session_nonce === nonce)
    );
    return session || null;
  }

  public async completeGameSession(
    sessionId: string,
    won: boolean,
    score: number,
    rewardGranted: boolean
  ): Promise<GameSession | null> {
    const session = await this.getGameSession(sessionId);
    if (!session) return null;

    session.status = 'completed';
    session.won = won;
    session.score = score;
    session.reward_granted = rewardGranted;
    session.completed_at = new Date().toISOString();

    this.saveLocalData();
    return session;
  }

  // --- User Settings ---
  public async getSettings(userId: string): Promise<UserSettings> {
    const existing = this.memoryData.user_settings.find(s => s.user_id === userId);
    if (existing) return existing;

    const defaultSettings: UserSettings = {
      user_id: userId,
      theme: 'dark',
      default_model: 'auto',
      routing_preference: 'balanced',
      voice_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.memoryData.user_settings.push(defaultSettings);
    this.saveLocalData();
    return defaultSettings;
  }

  public async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings(userId);
    const updated: UserSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };

    const idx = this.memoryData.user_settings.findIndex(s => s.user_id === userId);
    if (idx >= 0) {
      this.memoryData.user_settings[idx] = updated;
    } else {
      this.memoryData.user_settings.push(updated);
    }
    this.saveLocalData();
    return updated;
  }
}

export const db = new DatabaseManager();
