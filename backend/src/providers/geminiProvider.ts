import { AIProvider, ChatMessage, ModelCapability, ProviderHealth } from './types.js';

export class GeminiProvider implements AIProvider {
  public id = 'gemini';
  public name = 'Google Gemini';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
  }

  public isConfigured(): boolean {
    return !!this.apiKey && !this.apiKey.includes('placeholder');
  }

  public listModels(): ModelCapability[] {
    return [
      {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        provider: 'Google Gemini',
        contextLength: 1048576,
        isLocal: false,
        capabilities: ['chat', 'code', 'vision', 'tools', 'search'],
        description: 'Reliable multimodal Flash model with massive 1M context, strong reasoning and stable free-tier throughput.',
        recommendedFor: ['coding', 'research', 'general', 'analysis', 'creative'],
        freeTier: true
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash Lite',
        provider: 'Google Gemini',
        contextLength: 1048576,
        isLocal: false,
        capabilities: ['chat', 'code', 'vision'],
        description: 'Lightweight Flash Lite variant tuned for lowest latency and high free-tier availability.',
        recommendedFor: ['general', 'creative'],
        freeTier: true
      },
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        provider: 'Google Gemini',
        contextLength: 1048576,
        isLocal: false,
        capabilities: ['chat', 'code', 'vision', 'tools', 'search'],
        description: 'Newest multimodal Flash model; strongest reasoning but can hit high-demand 503s on the free tier.',
        recommendedFor: ['coding', 'research', 'analysis'],
        freeTier: true
      }
    ];
  }

  public async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      if (!this.isConfigured()) {
        return {
          providerId: this.id,
          isHealthy: false,
          lastChecked: new Date().toISOString(),
          error: 'GEMINI_API_KEY is not set or contains placeholder'
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
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
        error: err.message || 'Gemini connection failed'
      };
    }
  }

  private convertMessages(messages: ChatMessage[]) {
    const contents: any[] = [];
    let systemInstruction = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += msg.content + '\n';
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    return { contents, systemInstruction };
  }

  public async generateText(
    messages: ChatMessage[],
    modelId: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ text: string; modelUsed: string }> {
    if (!this.isConfigured()) {
      throw new Error('Google Gemini API key not configured.');
    }

    const { contents, systemInstruction } = this.convertMessages(messages);
    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const res = await fetch(
      `${this.baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
    return { text, modelUsed: modelId };
  }

  public async generateStream(
    messages: ChatMessage[],
    modelId: string,
    onChunk: (chunk: string) => void,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ fullText: string; modelUsed: string }> {
    if (!this.isConfigured()) {
      throw new Error('Google Gemini API key not configured.');
    }

    const { contents, systemInstruction } = this.convertMessages(messages);
    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const res = await fetch(
      `${this.baseUrl}/models/${modelId}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini stream error (${res.status}): ${errText.slice(0, 200)}`);
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

        try {
          const parsed = JSON.parse(jsonStr);
          const parts = parsed.candidates?.[0]?.content?.parts || [];
          const textChunk = parts.map((p: any) => p.text).join('');
          if (textChunk) {
            fullText += textChunk;
            onChunk(textChunk);
          }
        } catch {
          // ignore
        }
      }
    }

    return { fullText, modelUsed: modelId };
  }
}
