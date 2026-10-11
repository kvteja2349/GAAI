# GAAI Architecture Specification

## 1. Architectural Philosophy

GAAI is built upon three pillars:
1. **Zero Cloud Leak Privacy**: Chats, prompt history, and uploaded files stay in the user's browser by default.
2. **Server-Validated Economics**: All credits and arcade wins are accounted on the server with immutable ledgers, nonces, and transaction idempotency.
3. **Smart Multi-Provider Routing**: Decouples the application from any single AI vendor, allowing seamless switching across Google Gemini, Groq, local Ollama, and OpenAI-compatible endpoints.

```
┌────────────────────────────────────────────────────────┐
│                   GAAI Frontend Shell                  │
│       React 19 + TypeScript + Tailwind + Lucide        │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   AI Chat    │  │ 6-Game Arcade│  │Credit Wallet │  │
│  │  Streaming   │  │Canvas Physics│  │Ledger Modal  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│   Browser Storage   Server Session    Live Balance     │
│   (IndexedDB/Local)  Challenge Nonce    Polling        │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │ REST / SSE      │ Verify Move Log │ Query
          ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────┐
│                    GAAI Backend API                    │
│             Node.js + Express + TypeScript             │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  AIRouter &  │  │Arcade Engine │  │Credit Manager│  │
│  │Line Counter  │  │Game Validator│  │Waterfalled   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────┘
          ▼                 ▼                 ▼
   Free AI Providers  Game Verification  Database Ledger
   (Gemini, Groq,    (Minimax, Chess.js,  (PostgreSQL/
    Ollama, Flux)     Physics Engine)      Local JSON)
```

---

## 2. Credit Waterfall & Accounting Mechanism

- **Welcome Balance**: 5 credits granted once per account upon registration.
- **Daily Balance**: 5 credits granted daily according to the configured timezone (`Asia/Kolkata` midnight).
- **Game Rewards**: +1 credit per verified arcade win.
- **Output Line Cap**: 1 credit authorizes up to 500 lines of output.
- **Reservation Lock**: During streaming, 1 credit is temporarily locked. When line count exceeds 500, next credit is automatically committed if available. If exhausted, generation terminates with the Credit-Out alert.
- **Debit Waterfall**: When output is generated, credits deduct first from the expiring Daily Balance, then Welcome Balance, and lastly Game-Earned Balance.

---

## 3. Server-Validated Arcade Flow

```
Client                             Server
  │                                  │
  │─── POST /arcade/sessions ───────>│ Issues Session ID & Cryptographic Nonce
  │<── { sessionId, sessionNonce } ──│
  │                                  │
  │  (Player plays game in browser)  │
  │                                  │
  │─── POST /arcade/rewards ────────>│ Submits moves/shots log + Session Nonce
  │                                  │ 1. Validates Session exists & status = active
  │                                  │ 2. Runs Game Validator (e.g. Chess checkmate,
  │                                  │    Cricket runs >= 25, TicTacToe 3-in-row)
  │                                  │ 3. If Won: atomically inserts +1 in Ledger
  │                                  │ 4. Marks session as completed (prevents replay)
  │<── { valid: true, credit: 1 } ───│
```
