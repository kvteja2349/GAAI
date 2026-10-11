# GAAI Deployment Guide

Deploy GAAI to free-tier cloud hosting while staying within the **₹0/month** target.

---

## 1. Frontend Deployment (Cloudflare Pages / Vercel / Netlify)

The frontend is a static Vite SPA:
1. Build command: `npm run build --workspace=frontend`
2. Output directory: `frontend/dist`
3. Environment variables:
   - Point `/api` to your deployed backend URL or set a reverse proxy rule in Cloudflare Pages `_routes.json` or `vercel.json`.

---

## 2. Backend Deployment (Render / Railway / Fly.io / VPS)

1. Build command: `npm run build --workspace=backend`
2. Start command: `node dist/server.js` (from `backend/`)
3. Environment variables to set:
   - `PORT`: `5000` (or host assigned port)
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Random 64-char key
   - `CORS_ORIGIN`: Your frontend URL (e.g. `https://gaai.pages.dev`)
   - `DAILY_RESET_TIMEZONE`: `Asia/Kolkata`
   - `GEMINI_API_KEY`: Your Google AI Studio key
   - `GROQ_API_KEY`: Your Groq API key

---

## 3. Database Deployment (Supabase Free Tier)

1. Create a free project at [Supabase](https://supabase.com).
2. Open the Supabase SQL Editor.
3. Run `database/migrations/001_initial_schema.sql`.
4. Run `database/policies/row_level_security.sql`.
5. Copy your Project URL and Service Role Key to backend environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
