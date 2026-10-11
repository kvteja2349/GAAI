# GAAI — Gaming AI (Artificial Intelligence)
### Production-Oriented Full-Stack AI & Arcade Gaming Platform

![GAAI Hero Banner](https://img.shields.io/badge/GAAI-Gaming%20AI-8b5cf6?style=for-the-badge&logo=gamepad)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-19-cyan?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-24-green?style=for-the-badge&logo=node.js)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)
![Target Budget](https://img.shields.io/badge/Budget-₹0%2Fmonth-emerald?style=for-the-badge)

GAAI is a production-grade multipurpose AI web platform combining an AI assistant, an intelligent multi-provider model router, a credit usage system (500 lines/credit), a six-game arcade with server-validated rewards, voice interaction, file analysis, image generation, web search, and a premium gaming-inspired dark/light interface.

---

## 🎮 Key Features

- **Multipurpose AI Assistant**: Handles coding, research, essays, study notes, planning, and file analysis.
- **Credit Economics**:
  - **5 Welcome Credits** on sign-up (granted once).
  - **5 Daily Credits** granted at `Asia/Kolkata` midnight.
  - **+1 Credit per verified game win** in the Arcade.
  - **500 Lines per Credit**: Strict server-side line accounting with automatic continuation.
- **Six-Game Arcade (100% Playable & Server-Validated)**:
  1. **Tic-Tac-Toe**: Minimax AI strategy.
  2. **Eight-Ball Pool**: 2D Canvas billiards physics with pocket detection.
  3. **Mini Chess**: Algorithmic AI opponent with strict legal move validation (`chess.js`).
  4. **Carrom Championship**: Board physics with striker baseline aiming and Queen cover.
  5. **Cornhole Classic**: Trajectory arc toss towards target board and hole (match to 21).
  6. **Six-Ball Cricket Batting Challenge**: Face 6 deliveries — **score at least 25 runs to win +1 credit!**
- **Smart Multi-Provider AI Router**:
  - Automatic task classification (`coding`, `research`, `analysis`, `creative`).
  - Adapters for **Google Gemini** (`gemini-2.0-flash`, `gemini-1.5-pro`), **Groq** (`llama-3.3-70b`), and local **Ollama**.
  - Built-in fallback GAAI Autonomous Core.
- **Live Web Search**: DuckDuckGo instant retrieval with citations and links.
- **Generative AI Images**: Zero-cost, high-fidelity Flux.1 image generation via Pollinations.ai.
- **Voice Capabilities**: Web Speech API speech-to-text input and natural text-to-speech voice playback.
- **Zero Cloud Leak Privacy**: Conversations and attachments remain stored inside the user's browser storage by default.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run backend and frontend concurrently
npm run dev:backend
npm run dev:frontend
```

Visit `http://localhost:5173` to experience GAAI!

---

## 🧪 Automated Test Suite

```bash
npm run test --workspace=backend
```

Runs 14 automated unit and integration tests covering:
- Welcome credit grant (exactly once).
- Daily grant single-claim per reset window.
- Game-earned vs daily credit separation in ledger.
- Idempotency key duplicate protection.
- 500-line debit calculation.
- Tic-tac-toe win, loss, and draw rules.
- Chess Scholar's Mate validation.
- Cricket challenge 25-run mandatory threshold rule.
- Cricket wicket dismissal logic.
- Server session anti-tampering and replay protection.
- Line counter normalizer across CRLF and LF.

---

## 📁 Repository Structure

```
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── credits/        # LineCounter, CreditManager, Ledger
│   │   ├── database/       # Types, local JSON store & Supabase adapter
│   │   ├── games/          # Server validation engines for all 6 arcade games
│   │   ├── middleware/     # Auth, rate-limiting, error handling
│   │   ├── providers/      # Gemini, Groq, Ollama, Pollinations, WebSearch
│   │   ├── routes/         # Versioned REST API endpoints (/api/v1)
│   │   ├── services/       # AuthService, tokens, password reset
│   │   └── server.ts       # Express app setup
│   └── tests/              # Native node:test suite
├── frontend/
│   ├── src/
│   │   ├── app/            # App shell, routing
│   │   ├── components/     # Header, Sidebar, badges
│   │   ├── features/
│   │   │   ├── arcade/     # All 6 canvas/board games
│   │   │   ├── chat/       # Markdown, KaTeX, CodeBlock, Canvas workspace
│   │   │   ├── credits/    # CreditWalletModal, CreditOutModal
│   │   │   ├── models/     # AI Models & Health status view
│   │   │   └── settings/   # Preferences, export, import
│   │   ├── hooks/          # useCredits, useAuth, useTheme
│   │   └── lib/            # API client, local storage manager
├── database/
│   ├── migrations/         # 001_initial_schema.sql
│   └── policies/           # row_level_security.sql
├── docs/                   # SETUP.md, ARCHITECTURE.md, GAME_RULES.md, etc.
├── .env.example
└── package.json
```

---

## 📜 License

MIT License. Designed and built for the GAAI specification.
