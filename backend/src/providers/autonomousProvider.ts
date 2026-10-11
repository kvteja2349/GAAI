import { AIProvider, ChatMessage, ModelCapability, ProviderHealth } from './types.js';

export class AutonomousProvider implements AIProvider {
  public id = 'gaai-local';
  public name = 'GAAI Embedded Core';

  public isConfigured(): boolean {
    return true; // Always available out of the box
  }

  public listModels(): ModelCapability[] {
    return [
      {
        id: 'gaai-core-1.0',
        name: 'GAAI Core Assist',
        provider: 'GAAI Embedded Core',
        contextLength: 32768,
        isLocal: true,
        capabilities: ['chat', 'code', 'tools'],
        description: 'Built-in local engine providing game strategies, system guidance, and developer tools.',
        recommendedFor: ['general', 'coding'],
        freeTier: true
      }
    ];
  }

  public async checkHealth(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      isHealthy: true,
      lastChecked: new Date().toISOString(),
      latencyMs: 1
    };
  }

  public async generateText(
    messages: ChatMessage[],
    modelId: string
  ): Promise<{ text: string; modelUsed: string }> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const text = this.formulateResponse(lastUserMsg);
    return { text, modelUsed: modelId };
  }

  public async generateStream(
    messages: ChatMessage[],
    modelId: string,
    onChunk: (chunk: string) => void
  ): Promise<{ fullText: string; modelUsed: string }> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const fullText = this.formulateResponse(lastUserMsg);

    // Stream out words with realistic natural cadence
    const words = fullText.split(' ');
    for (let i = 0; i < words.length; i++) {
      const piece = (i === 0 ? '' : ' ') + words[i];
      onChunk(piece);
      await new Promise(r => setTimeout(r, 12));
    }

    return { fullText, modelUsed: modelId };
  }

  private formulateResponse(prompt: string): string {
    const p = prompt.toLowerCase();

    if (p.includes('game') || p.includes('arcade') || p.includes('credit') || p.includes('earn')) {
      return `### 🎮 GAAI Arcade & Credit System

Welcome to **GAAI (Gaming AI)**! Here is how our credit and arcade mechanics operate:

1. **Credit Balances:**
   - **Welcome Grant:** Every new account gets **5 initial credits** upon creation.
   - **Daily Credits:** You receive **5 fresh credits daily** at midnight (\`Asia/Kolkata\` timezone).
   - **Game Rewards:** Win any of our 6 arcade games to earn **+1 credit per verified win**!

2. **Arcade Games Available:**
   - **Tic-Tac-Toe:** Classic 3×3 strategy vs. AI.
   - **Eight-Ball Pool:** 2D Canvas physics pool with real pocket collision detection.
   - **Mini Chess:** Full chess rules engine (checkmate/stalemate/legal moves).
   - **Carrom:** Physics-driven carrom board with striker aiming and coin pocketing.
   - **Cornhole:** Trajectory physics toss towards the target board and hole.
   - **Six-Ball Cricket Challenge:** Face 6 deliveries — **score at least 25 runs to win the credit!**

3. **Output Limits:**
   - 1 credit authorizes up to **500 generated lines of output**. If generation exceeds 500 lines, an additional credit is automatically debited.

Head over to the **Arcade** tab to play and top up your credits!`;
    }

    if (p.includes('code') || p.includes('program') || p.includes('function') || p.includes('python') || p.includes('javascript')) {
      return `### 💻 GAAI Code Workspace

Here is a clean implementation example:

\`\`\`typescript
/**
 * GAAI Token & Credit Calculation Helper
 */
export interface CreditBudget {
  spendableCredits: number;
  maxLinesAllowed: number;
}

export function computeLineQuota(credits: number): CreditBudget {
  const LINES_PER_CREDIT = 500;
  return {
    spendableCredits: credits,
    maxLinesAllowed: Math.max(0, credits * LINES_PER_CREDIT)
  };
}

// Example usage:
const budget = computeLineQuota(5);
console.log(\`Spendable lines: \${budget.maxLinesAllowed}\`); // 2500 lines
\`\`\`

*Note: For unrestricted external LLM inference, configure your Google Gemini API key or Groq API key in your \`.env\` file or AI Models settings!*`;
    }

    if (p.includes('search') || p.includes('web')) {
      return `### 🌐 GAAI Live Web Search

GAAI features live web retrieval capabilities using DuckDuckGo Instant Answers. 
When web search is activated in your prompt, GAAI queries current sources, gathers live snippets, and provides verifiable citations!`;
    }

    return `Hello! I am **GAAI**, your Gaming AI companion. 

I can assist you with:
- 💻 **Software Engineering & Coding:** Architecture, debugging, and code snippets.
- 🎯 **Arcade Gaming & Rewards:** Play our 6 physics & board games to earn free credits!
- 📄 **File Analysis:** Upload TXT, MD, PDF, CSV, DOCX, or code files for instant processing.
- 🎨 **Image Generation:** Create images using the integrated image engine.
- 🎙️ **Voice Interaction:** Speech-to-text input and natural text-to-speech voice playback.

> **Pro-Tip:** If you have configured a **Google Gemini** or **Groq** free-tier API key in \`.env\`, GAAI automatically routes your requests to high-speed models with up to 1M token context!`;
  }
}
