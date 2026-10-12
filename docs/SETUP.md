# GAAI Setup Guide

Welcome to **GAAI (Gaming AI — Artificial Intelligence)**! This guide details local setup, dependencies, environment configuration, and verification.

---

## 1. Prerequisites

- **Node.js**: v20+ or v22+ / v24+
- **npm**: v9+
- *(Optional)* **Ollama**: For 100% offline, free local AI inference.

---

## 2. Quickstart (Under 2 Minutes)

From the project root (`Projects/gaai`):

```bash
# 1. Install all monorepo dependencies (backend and frontend)
npm install

# 2. Start both backend and frontend concurrently
npm run dev:backend
# In another terminal:
npm run dev:frontend
```

Open your browser to:
- **Frontend App**: `http://localhost:5173`
- **Backend Health Check**: `http://localhost:5000/api/v1/health`

---

## 3. Configuring Free-Tier AI Providers (₹0/Month)

GAAI works immediately out of the box with the built-in **GAAI Autonomous Core**. To enable large language models for coding, essays, and deep reasoning at zero cost:

### Option A: Google Gemini API (Recommended)
1. Go to [Google AI Studio](https://aistudio.google.com/) and create a free API key.
2. Open `backend/.env` (or copy from `.env.example`).
3. Set `GEMINI_API_KEY=your_key_here`.
4. Restart backend. GAAI will now route requests to `gemini-3.8-flash`, `gemini-3.5-flash`, and `gemini-3.1-flash-lite` with up to 1M token context!

### Option B: Groq Cloud (Ultra-Fast)
1. Go to [Groq Console](https://console.groq.com/) and create a free key.
2. In `backend/.env`, set `GROQ_API_KEY=your_groq_key_here`.
3. GAAI will route coding tasks to `llama-3.3-70b-versatile` at ~300 tokens/second!

### Option C: Local Offline AI (Ollama)
1. Install [Ollama](https://ollama.ai/).
2. Run `ollama run llama3` or `ollama run mistral`.
3. GAAI automatically detects `http://localhost:11434/v1` with zero setup needed!

---

## 4. Running the Automated Test Suite

Run backend automated verification:

```bash
npm run test --workspace=backend
```

All 14 tests for credits, line limit calculations, anti-tamper arcade validation, and rules will execute and verify within milliseconds.

---

## 5. Building for Production

```bash
npm run build
```

This compiles TypeScript backend into `backend/dist/` and creates the optimized frontend bundle in `frontend/dist/`.
