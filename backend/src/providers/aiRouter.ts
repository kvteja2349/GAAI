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

  /**
   * Returns true for transient upstream failures worth retrying on another model:
   * free-tier rate limits, high-demand unavailability, and network/timeout errors.
   */
  private isTransientError(err: any): boolean {
    const msg = String(err?.message || err || '');
    return (
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('504') ||
      msg.includes('overloaded') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand') ||
      msg.includes('quota') ||
      msg.includes('fetch failed') ||
      msg.includes('timeout') ||
      msg.includes('aborted')
    );
  }

  /**
   * Builds an ordered fallback chain of {provider, model} candidates.
   * The explicitly requested (or task-preferred) model comes first, followed by
   * every other usable model in provider priority order (Gemini → Groq → Ollama → custom → GAAI core).
   */
  private buildCandidateChain(task: TaskType, requestedModelId?: string): { provider: AIProvider; model: ModelCapability }[] {
    const chain: { provider: AIProvider; model: ModelCapability }[] = [];
    const seen = new Set<string>();

    const push = (provider: AIProvider, model: ModelCapability) => {
      const key = `${provider.id}:${model.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      chain.push({ provider, model });
    };

    // 1. Explicit model request (skips 'auto')
    if (requestedModelId && requestedModelId !== 'auto') {
      for (const provider of this.providers.values()) {
        if (provider.id === 'gaai-local') continue;
        if (!provider.isConfigured() && provider.id !== 'ollama') continue;
        const model = provider.listModels().find(m => m.id === requestedModelId);
        if (model) {
          push(provider, model);
          break;
        }
      }
    }

    // 2. Task-preferred model from each configured provider, then their remaining models
    const providerPriority = ['gemini', 'groq', 'ollama', 'custom', 'gaai-local'];
    for (const id of providerPriority) {
      const provider = this.providers.get(id);
      if (!provider) continue;
      if (id !== 'ollama' && id !== 'gaai-local' && !provider.isConfigured()) continue;

      const models = provider.listModels();
      const preferred = models.find(m => m.recommendedFor.includes(task));
      if (preferred) push(provider, preferred);
      for (const model of models) push(provider, model);
    }

    return chain;
  }

  public async selectBestModel(task: TaskType, requestedModelId?: string): Promise<{ provider: AIProvider; model: ModelCapability }> {
    const chain = this.buildCandidateChain(task, requestedModelId);

    // Verify cloud providers are reachable; keep local/core entries regardless.
    for (const candidate of chain) {
      if (candidate.provider.id === 'gaai-local') return candidate;
      if (candidate.provider.id === 'ollama') continue;
      const health = await candidate.provider.checkHealth();
      if (health.isHealthy) return candidate;
    }

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

      let accumulatedText = '';
      let stoppedForCredits = false;
      const task = this.classifyTask(lastUserMsg);
      const candidates = this.buildCandidateChain(task, requestedModelId);
      let selectedProvider: AIProvider | null = null;
      let selectedModel: ModelCapability | null = null;
      let lastError: any = null;

      // Try the preferred model first, then automatically fall back when a
      // provider is rate-limited, overloaded, or unavailable before streaming.
      for (const candidate of candidates) {
        let emittedAny = false;
        try {
          const streamResult = await candidate.provider.generateStream(messages, candidate.model.id, (delta: string) => {
            if (stoppedForCredits) return;

            emittedAny = true;
            accumulatedText += delta;
            const currentLines = LineCounter.countLines(accumulatedText);

            // Check if we hit the 500-line milestone for another credit.
            const authorizedLines = currentReservedCredits * LineCounter.MAX_LINES_PER_CREDIT;
            if (currentLines > authorizedLines) {
              void creditManager.hasAvailableCredits(userId, 1).then(hasMoreCredits => {
                if (hasMoreCredits) currentReservedCredits += 1;
              });
            }

            if (onChunk) onChunk(delta);
          });

          if (!streamResult.fullText.trim() && !accumulatedText.trim()) {
            lastError = new Error(`${candidate.model.id} returned an empty response`);
            continue;
          }

          selectedProvider = candidate.provider;
          selectedModel = candidate.model;
          break;
        } catch (err: any) {
          lastError = err;
          // Once content has reached the client, switching models would
          // duplicate or corrupt the answer, so surface the original error.
          if (emittedAny || !this.isTransientError(err)) throw err;
        }
      }

      if (!selectedProvider || !selectedModel) {
        throw lastError || new Error('All configured AI providers failed to generate a response.');
      }

      const totalLines = LineCounter.countLines(accumulatedText);
      const commitResult = await creditManager.commitGenerationDebit(
        userId,
        reservationId,
        totalLines,
        { model: selectedModel.id, provider: selectedProvider.id }
      );

      return {
        fullText: accumulatedText,
        modelUsed: `${selectedModel.name} (${selectedProvider.name})`,
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
