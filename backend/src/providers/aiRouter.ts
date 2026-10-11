import { AIProvider, ChatMessage, ModelCapability, ProviderHealth, TaskType } from './types.js';
import { GeminiProvider } from './geminiProvider.js';
import { OpenAICompatibleProvider } from './openaiCompatibleProvider.js';
import { AutonomousProvider } from './autonomousProvider.js';
import { LineCounter } from '../credits/lineCounter.js';
import { creditManager } from '../credits/creditManager.js';
import { WebSearchService } from './webSearchService.js';

export class AIRouter {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    this.registerProviders();
  }

  private registerProviders() {
    // 1. Google Gemini
    const geminiKey = process.env.GEMINI_API_KEY || '';
    this.providers.set('gemini', new GeminiProvider(geminiKey));

    // 2. Groq (Free tier high-speed Llama models)
    const groqKey = process.env.GROQ_API_KEY || '';
    const groqModels: ModelCapability[] = [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B (Groq)',
        provider: 'Groq',
        contextLength: 128000,
        isLocal: false,
        capabilities: ['chat', 'code'],
        description: 'Blazing fast inference with top-tier open weights reasoning.',
        recommendedFor: ['coding', 'general', 'analysis'],
        freeTier: true
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B (Groq)',
        provider: 'Groq',
        contextLength: 128000,
        isLocal: false,
        capabilities: ['chat'],
        description: 'Ultra-low latency model for conversational tasks.',
        recommendedFor: ['general', 'creative'],
        freeTier: true
      }
    ];
    this.providers.set('groq', new OpenAICompatibleProvider(
      'groq',
      'Groq Cloud',
      'https://api.groq.com/openai/v1',
      groqKey,
      groqModels
    ));

    // 3. Ollama (Local AI)
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    const ollamaModels: ModelCapability[] = [
      {
        id: 'llama3:latest',
        name: 'Llama 3 (Ollama Local)',
        provider: 'Ollama',
        contextLength: 8192,
        isLocal: true,
        capabilities: ['chat', 'code'],
        description: 'Run completely offline on your local GPU/CPU with 100% privacy.',
        recommendedFor: ['general', 'coding'],
        freeTier: true
      },
      {
        id: 'mistral:latest',
        name: 'Mistral (Ollama Local)',
        provider: 'Ollama',
        contextLength: 8192,
        isLocal: true,
        capabilities: ['chat'],
        description: 'High efficiency open model for local desktop execution.',
        recommendedFor: ['general'],
        freeTier: true
      }
    ];
    this.providers.set('ollama', new OpenAICompatibleProvider(
      'ollama',
      'Ollama Local Server',
      ollamaUrl,
      '',
      ollamaModels
    ));

    // 4. Generic OpenAI-Compatible (OpenRouter / Together / etc.)
    const customBaseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL || '';
    const customApiKey = process.env.OPENAI_COMPATIBLE_API_KEY || '';
    if (customBaseUrl) {
      this.providers.set('custom', new OpenAICompatibleProvider(
        'custom',
        'Custom OpenAI-Compatible',
        customBaseUrl,
        customApiKey,
        [
          {
            id: process.env.OPENAI_COMPATIBLE_MODEL || 'default-model',
            name: 'Custom Endpoint Model',
            provider: 'Custom',
            contextLength: 32768,
            isLocal: false,
            capabilities: ['chat', 'code'],
            description: 'Configured custom endpoint model.',
            recommendedFor: ['general', 'coding'],
            freeTier: true
          }
        ]
      ));
    }

    // 5. GAAI Autonomous Core
    this.providers.set('gaai-local', new AutonomousProvider());
  }

  public classifyTask(prompt: string): TaskType {
    const p = prompt.toLowerCase();
    if (
      p.includes('code') ||
      p.includes('function') ||
      p.includes('class') ||
      p.includes('bug') ||
      p.includes('refactor') ||
      p.includes('typescript') ||
      p.includes('python') ||
      p.includes('sql') ||
      p.includes('api') ||
      p.includes('html') ||
      p.includes('css')
    ) {
      return 'coding';
    }
    if (
      p.includes('search') ||
      p.includes('latest') ||
      p.includes('news') ||
      p.includes('current') ||
      p.includes('find out') ||
      p.includes('who is') ||
      p.includes('when was')
    ) {
      return 'research';
    }
    if (
      p.includes('story') ||
      p.includes('poem') ||
      p.includes('essay') ||
      p.includes('creative') ||
      p.includes('imagine') ||
      p.includes('novel')
    ) {
      return 'creative';
    }
    if (
      p.includes('analyze') ||
      p.includes('summary') ||
      p.includes('csv') ||
      p.includes('data') ||
      p.includes('calculate') ||
      p.includes('solve')
    ) {
      return 'analysis';
    }
    return 'general';
  }

  public listAllModels(): ModelCapability[] {
    const all: ModelCapability[] = [];
    for (const provider of this.providers.values()) {
      all.push(...provider.listModels());
    }
    return all;
  }

  public async getHealthStatus(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    for (const provider of this.providers.values()) {
      const health = await provider.checkHealth();
      results.push(health);
    }
    return results;
  }

  public async selectBestModel(task: TaskType, requestedModelId?: string): Promise<{ provider: AIProvider; model: ModelCapability }> {
    const allModels = this.listAllModels();

    // 1. If explicit model requested and exists
    if (requestedModelId && requestedModelId !== 'auto') {
      const model = allModels.find(m => m.id === requestedModelId);
      if (model) {
        for (const prov of this.providers.values()) {
          if (prov.listModels().some(m => m.id === model.id)) {
            const health = await prov.checkHealth();
            if (health.isHealthy) {
              return { provider: prov, model };
            }
          }
        }
      }
    }

    // 2. Try configured online providers first (Gemini, Groq)
    const gemini = this.providers.get('gemini');
    if (gemini?.isConfigured()) {
      const health = await gemini.checkHealth();
      if (health.isHealthy) {
        const models = gemini.listModels();
        const preferred = models.find(m => m.recommendedFor.includes(task)) || models[0];
        return { provider: gemini, model: preferred };
      }
    }

    const groq = this.providers.get('groq');
    if (groq?.isConfigured()) {
      const health = await groq.checkHealth();
      if (health.isHealthy) {
        const models = groq.listModels();
        const preferred = models.find(m => m.recommendedFor.includes(task)) || models[0];
        return { provider: groq, model: preferred };
      }
    }

    // 3. Try local Ollama if healthy
    const ollama = this.providers.get('ollama');
    if (ollama) {
      const health = await ollama.checkHealth();
      if (health.isHealthy) {
        const models = ollama.listModels();
        return { provider: ollama, model: models[0] };
      }
    }

    // 4. Fallback to GAAI Autonomous Core
    const local = this.providers.get('gaai-local')!;
    return { provider: local, model: local.listModels()[0] };
  }

  /**
   * Main entry point for streaming AI generation with credit reservation,
   * 500-line limit check, and auto-continuation.
   */
  public async streamChatWithCredits(
    userId: string,
    messages: ChatMessage[],
    requestedModelId?: string,
    enableWebSearch: boolean = false,
    onChunk?: (chunk: string) => void
  ): Promise<{
    fullText: string;
    modelUsed: string;
    linesGenerated: number;
    creditsCharged: number;
    stoppedForCredits: boolean;
    citations?: any[];
  }> {
    // Check initial credit reservation (1 credit)
    const reservation = await creditManager.reserveCredits(userId, 1);
    if (!reservation.success) {
      throw new Error("You're out of credits. Open the Arcade to earn more credits!");
    }

    const reservationId = reservation.reservationId!;
    let currentReservedCredits = 1;

    try {
      // If web search is requested, augment messages with DuckDuckGo real search snippets
      let citations: any[] = [];
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      if (enableWebSearch && lastUserMsg) {
        const searchResults = await WebSearchService.search(lastUserMsg, 4);
        if (searchResults.length > 0) {
          citations = searchResults;
          const searchContext = searchResults
            .map((r, i) => `[Source ${i + 1}]: "${r.title}" (${r.url})\n${r.snippet}`)
            .join('\n\n');
          messages.unshift({
            role: 'system',
            content: `You have access to current web search information:\n${searchContext}\nCite relevant sources using [Source 1], [Source 2], etc.`
          });
        }
      }

      const task = this.classifyTask(lastUserMsg);
      const { provider, model } = await this.selectBestModel(task, requestedModelId);

      let accumulatedText = '';
      let stoppedForCredits = false;

      // Stream generation
      await provider.generateStream(messages, model.id, (delta: string) => {
        if (stoppedForCredits) return;

        accumulatedText += delta;
        const currentLines = LineCounter.countLines(accumulatedText);

        // Check if we hit the 500-line milestone per credit
        const authorizedLines = currentReservedCredits * LineCounter.MAX_LINES_PER_CREDIT;
        if (currentLines > authorizedLines) {
          // Attempt automatic continuation: check if another credit is available
          const hasMoreCredits = creditManager.hasAvailableCredits(userId, 1);
          // Note: we check synchronously or reserve next
          currentReservedCredits += 1;
        }

        if (onChunk) {
          onChunk(delta);
        }
      });

      const totalLines = LineCounter.countLines(accumulatedText);
      const commitResult = await creditManager.commitGenerationDebit(
        userId,
        reservationId,
        totalLines,
        { model: model.id, provider: provider.id }
      );

      return {
        fullText: accumulatedText,
        modelUsed: `${model.name} (${provider.name})`,
        linesGenerated: totalLines,
        creditsCharged: commitResult.creditsCharged,
        stoppedForCredits,
        citations: citations.length > 0 ? citations : undefined
      };
    } catch (err: any) {
      creditManager.releaseReservation(reservationId);
      throw err;
    }
  }
}

export const aiRouter = new AIRouter();
