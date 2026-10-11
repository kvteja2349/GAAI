# GAAI AI Providers Guide

GAAI is built with a decoupled provider architecture, allowing smart automatic routing across zero-cost cloud tiers and private local inference servers.

---

## 1. Supported Providers

| Provider | Models Supported | Context Window | Price | Setup Key |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` | Up to 2,000,000 tokens | **Free** (15 RPM) | `GEMINI_API_KEY` |
| **Groq Cloud** | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` | 128,000 tokens | **Free** tier | `GROQ_API_KEY` |
| **Ollama Local** | `llama3`, `mistral`, `codellama`, `qwen2.5` | 8,192 - 32,768 tokens | **100% Free** | `OLLAMA_BASE_URL` |
| **Custom OpenAI** | Any OpenAI-compatible endpoint (LM Studio, OpenRouter) | Configurable | Varies | `OPENAI_COMPATIBLE_BASE_URL` |
| **GAAI Autonomous**| GAAI Core Engine | 32,768 tokens | **Built-in** | Always available |

---

## 2. Smart Routing Policy

When you send a prompt, GAAI analyzes its task category:
- **Coding & Engineering**: Prefers `gemini-2.0-flash` or Groq `llama-3.3-70b-versatile`.
- **Deep Research**: Augments prompt with live DuckDuckGo search citations.
- **Analysis**: Routes to large-context models.
- **Creative Writing**: High-temperature generation.
- **Offline / Private**: Routes directly to local Ollama.

If a cloud provider encounters rate limiting (HTTP 429) or timeouts, the circuit breaker automatically falls back to the next healthy provider in the chain.

---

## 3. Image Generation Integration

- GAAI utilizes **Pollinations.ai (Flux.1 engine)** for 100% free, high-speed, realistic image generation without needing an API key.
- Supports aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`.
- Optional: Configure `OPENAI_API_KEY` to route image requests to DALL-E 3.

---

## 4. Live Web Search Integration

- Web search queries DuckDuckGo Instant Answers and Web Topics.
- Live snippets, URLs, and titles are retrieved and formatted as citations in the AI's answer.
