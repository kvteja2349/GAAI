import { AIProvider, ChatMessage, ModelCapability, ProviderHealth } from './types.js';

export class OpenAICompatibleProvider implements AIProvider {
  public id: string;
  public name: string;
  private baseUrl: string;
  private apiKey: string;
  private models: ModelCapability[];

  constructor(
    id: string,
    name: string,
    baseUrl: string,
    apiKey: string = '',
    models: ModelCapability[] = []
  ) {
    this.id = id;
    this.name = name;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.models = models;
  }

  public isConfigured(): boolean {
    if (this.id === 'ollama') {
      // Local ollama doesn't strictly need API key
      return !!this.baseUrl;
    }
    return !!this.apiKey && !this.apiKey.includes('placeholder');
  }

  public listModels(): ModelCapability[] {
    return this.models;
  }

  public async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      if (!this.isConfigured()) {
        return {
          providerId: this.id,
          isHealthy: false,
          lastChecked: new Date().toISOString(),
          error: 'Provider not configured or API key missing'
        };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return {
          providerId: this.id,
          isHealthy: true,
          lastChecked: new Date().toISOString(),
          latencyMs
        };
      } else {
        return {
          providerId: this.id,
          isHealthy: false,
          lastChecked: new Date().toISOString(),
          error: `HTTP ${res.status}: ${res.statusText}`,
          latencyMs
        };
      }
    } catch (err: any) {
      return {
        providerId: this.id,
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        error: err.message || 'Connection failed'
      };
    }
  }

  public async generateText(
    messages: ChatMessage[],
    modelId: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ text: string; modelUsed: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: modelId,
      messages,
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.7,
      stream: false
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`${this.name} API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { text, modelUsed: modelId };
  }

  public async generateStream(
    messages: ChatMessage[],
    modelId: string,
    onChunk: (chunk: string) => void,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ fullText: string; modelUsed: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: modelId,
      messages,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.7,
      stream: true
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      throw new Error(`${this.name} streaming error (${res.status}): ${errText.slice(0, 200)}`);
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // ignore non-json SSE lines
        }
      }
    }

    return { fullText, modelUsed: modelId };
  }
}
