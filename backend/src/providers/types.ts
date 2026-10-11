export type TaskType = 'coding' | 'general' | 'research' | 'creative' | 'analysis';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelCapability {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  isLocal: boolean;
  capabilities: ('chat' | 'code' | 'vision' | 'search' | 'tools')[];
  description: string;
  recommendedFor: TaskType[];
  freeTier: boolean;
}

export interface ProviderHealth {
  providerId: string;
  isHealthy: boolean;
  lastChecked: string;
  error?: string;
  latencyMs?: number;
}

export interface StreamChunk {
  delta: string;
  isFinished: boolean;
  totalLinesSoFar: number;
  creditsUsed: number;
  error?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  checkHealth(): Promise<ProviderHealth>;
  listModels(): ModelCapability[];
  generateText(
    messages: ChatMessage[],
    modelId: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ text: string; modelUsed: string }>;
  generateStream(
    messages: ChatMessage[],
    modelId: string,
    onChunk: (chunk: string) => void,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ fullText: string; modelUsed: string }>;
}
