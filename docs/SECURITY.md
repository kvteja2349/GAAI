# GAAI Security & Privacy Policy

## 1. Zero Cloud Leak Privacy
- Conversations, prompts, and file attachments are stored in browser local storage (`localStorage` & IndexedDB).
- The server does not persistently log or store raw conversational text.
- Users can clear all history locally with a single click in Settings.

## 2. Server-Validated Rewards & Anti-Abuse
- Clients cannot award themselves credits or modify credit balances.
- Game sessions are secured with single-use cryptographic nonces.
- Game outcomes are validated by server-side rule engines.
- Completed sessions are sealed to prevent duplicate reward replay.

## 3. Secret & API Key Protection
- External API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) exist strictly on the backend.
- Never exposed in client bundles or public repositories.
- Strict CORS configuration and Helmet security headers prevent cross-site hijacking.

## 4. File Upload Safety
- Files are parsed as raw untrusted text with maximum size limits (5MB).
- Code is never executed on the production server.
- Uploads are treated as untrusted document context.
