const TOKEN_KEY = 'gaai_auth_token';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  auth_provider: 'email' | 'google';
  welcome_granted: boolean;
  created_at: string;
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

export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  credit_type: 'welcome' | 'daily' | 'game' | 'adjustment';
  category: 'grant' | 'debit' | 'refund';
  reason: string;
  idempotency_key: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface WalletData extends CreditBalances {
  transactions: CreditLedgerEntry[];
}

export interface ModelCapability {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  isLocal: boolean;
  capabilities: string[];
  description: string;
  recommendedFor: string[];
  freeTier: boolean;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with HTTP ${res.status}`);
    }

    return data as T;
  }

  // --- Auth ---
  public async login(email: string, password: string) {
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    return res;
  }

  public async register(email: string, password: string, displayName: string) {
    const res = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    });
    this.setToken(res.token);
    return res;
  }

  public async loginWithGoogle(email: string, displayName: string, avatarUrl?: string) {
    const res = await this.request<{ user: User; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, displayName, avatarUrl })
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  public async resetPassword(email: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  public logout() {
    this.setToken(null);
  }

  // --- Credits & Wallet ---
  public async getWallet(): Promise<WalletData> {
    return this.request<WalletData>('/credits/wallet');
  }

  public async getBalance(): Promise<CreditBalances> {
    return this.request<CreditBalances>('/credits/balance');
  }

  public async claimDaily(): Promise<{ granted: boolean; message: string; balances: CreditBalances }> {
    return this.request('/credits/daily', { method: 'POST' });
  }

  // --- AI Models ---
  public async listModels(): Promise<{ models: ModelCapability[] }> {
    return this.request<{ models: ModelCapability[] }>('/ai/models');
  }

  public async getHealth(): Promise<{ health: any[] }> {
    return this.request<{ health: any[] }>('/ai/health');
  }

  // --- Chat Stream ---
  public async streamChat(
    messages: { role: string; content: string }[],
    modelId: string | undefined,
    webSearch: boolean,
    onChunk: (delta: string) => void,
    onDone: (data: { modelUsed: string; linesGenerated: number; creditsCharged: number; citations?: any[] }) => void,
    onError: (err: { message: string; isCreditError?: boolean }) => void
  ): Promise<() => void> {
    const controller = new AbortController();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, modelId, webSearch }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 402 || errorData.code === 'OUT_OF_CREDITS') {
          onError({ message: "You're out of credits. Play in the Arcade to earn more!", isCreditError: true });
        } else {
          onError({ message: errorData.error || `Generation failed (${res.status})` });
        }
        return () => {};
      }

      if (!res.body) {
        onError({ message: 'No response body stream received' });
        return () => {};
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.replace(/^data:\s*/, '');

              try {
                const event = JSON.parse(jsonStr);
                if (event.type === 'chunk') {
                  onChunk(event.delta);
                } else if (event.type === 'done') {
                  onDone(event);
                } else if (event.type === 'error') {
                  onError({ message: event.error, isCreditError: event.isCreditError });
                }
              } catch {
                // skip malformed sse line
              }
            }
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            onError({ message: err.message || 'Stream interrupted' });
          }
        }
      })();

      return () => controller.abort();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError({ message: err.message || 'Connection failed' });
      }
      return () => {};
    }
  }

  // --- Arcade ---
  public async getArcadeGames() {
    return this.request<{ games: any[] }>('/arcade/games');
  }

  public async startArcadeSession(gameType: string) {
    return this.request<{
      sessionId: string;
      sessionNonce: string;
      gameType: string;
      initialState: any;
      rules: string;
    }>('/arcade/sessions', {
      method: 'POST',
      body: JSON.stringify({ gameType })
    });
  }

  public async verifyArcadeReward(sessionId: string, sessionNonce: string, payload: any) {
    return this.request<{
      valid: boolean;
      won: boolean;
      score: number;
      creditAwarded: number;
      message: string;
      balances?: CreditBalances;
    }>('/arcade/rewards', {
      method: 'POST',
      body: JSON.stringify({ sessionId, sessionNonce, payload })
    });
  }

  // --- Images ---
  public async generateImage(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' = '1:1') {
    return this.request<{
      imageUrl: string;
      prompt: string;
      aspectRatio: string;
      provider: string;
      width: number;
      height: number;
      createdAt: string;
    }>('/images/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, aspectRatio })
    });
  }

  // --- Web Search ---
  public async searchWeb(query: string, limit: number = 5) {
    return this.request<{ query: string; results: any[] }>('/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit })
    });
  }

  // --- File Parsing ---
  public async parseFile(filename: string, content: string, isBase64: boolean = false, size: number = 0) {
    return this.request<{
      filename: string;
      extension: string;
      extractedText: string;
      charCount: number;
      lineCount: number;
      truncated: boolean;
    }>('/files/parse', {
      method: 'POST',
      body: JSON.stringify({ filename, content, isBase64, size })
    });
  }

  // --- Settings ---
  public async getSettings() {
    return this.request<any>('/settings');
  }

  public async updateSettings(settings: any) {
    return this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }
}

export const api = new ApiClient();
