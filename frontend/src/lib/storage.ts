export interface ChatAttachment {
  name: string;
  extension: string;
  size: number;
  extractedText: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  lines?: number;
  creditsCharged?: number;
  modelUsed?: string;
  attachments?: ChatAttachment[];
  citations?: { title: string; url: string; snippet: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessageItem[];
  pinned: boolean;
  modelId: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'gaai_local_conversations_v1';

export class LocalStorageManager {
  public static getConversations(): Conversation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[Storage] Failed to read local conversations:', e);
      return [];
    }
  }

  public static getConversation(id: string): Conversation | null {
    const list = this.getConversations();
    return list.find(c => c.id === id) || null;
  }

  public static saveConversation(conv: Conversation): void {
    try {
      const list = this.getConversations();
      const index = list.findIndex(c => c.id === conv.id);
      if (index >= 0) {
        list[index] = { ...conv, updatedAt: new Date().toISOString() };
      } else {
        list.unshift({ ...conv, updatedAt: new Date().toISOString() });
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[Storage] Quota exceeded or storage failure:', e);
    }
  }

  public static deleteConversation(id: string): void {
    try {
      const list = this.getConversations().filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[Storage] Delete error:', e);
    }
  }

  public static deleteAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[Storage] Clear error:', e);
    }
  }

  public static exportJSON(): string {
    const list = this.getConversations();
    return JSON.stringify({
      app: 'GAAI',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      conversations: list
    }, null, 2);
  }

  public static importJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.conversations)) {
        const current = this.getConversations();
        const mergedMap = new Map<string, Conversation>();
        current.forEach(c => mergedMap.set(c.id, c));
        parsed.conversations.forEach((c: Conversation) => {
          if (c.id && Array.isArray(c.messages)) {
            mergedMap.set(c.id, c);
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(mergedMap.values())));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
