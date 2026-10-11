-- GAAI Database Migration 001
-- PostgreSQL / Supabase Schema

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    auth_provider VARCHAR(50) DEFAULT 'email',
    welcome_granted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. CREDIT LEDGER TABLE (Append-Only Immutable Ledger)
CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL, -- positive for grants, negative for debits
    credit_type VARCHAR(50) NOT NULL, -- 'welcome', 'daily', 'game', 'adjustment'
    category VARCHAR(50) NOT NULL, -- 'grant', 'debit', 'refund'
    reason VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON credit_ledger(credit_type);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at);

-- 3. DAILY GRANTS TABLE (Prevents duplicate grants per day)
CREATE TABLE IF NOT EXISTS daily_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grant_date DATE NOT NULL, -- YYYY-MM-DD in Asia/Kolkata timezone
    amount INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_daily_grant UNIQUE (user_id, grant_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_grants_user_date ON daily_grants(user_id, grant_date);

-- 4. GAME SESSIONS TABLE (Server-Validated Arcade Sessions)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL, -- 'tictactoe', 'pool', 'chess', 'carrom', 'cornhole', 'cricket'
    session_nonce VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    state_data JSONB DEFAULT '{}'::jsonb,
    won BOOLEAN NOT NULL DEFAULT FALSE,
    reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
    score INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_nonce ON game_sessions(user_id, session_nonce);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- 5. AI GENERATION SESSIONS (Line Counting & Reservations)
CREATE TABLE IF NOT EXISTS generation_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'reserved', -- 'reserved', 'committed', 'released'
    credits_reserved INT NOT NULL DEFAULT 1,
    lines_generated INT NOT NULL DEFAULT 0,
    model_id VARCHAR(100),
    prompt_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USER SETTINGS
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    default_model VARCHAR(100) DEFAULT 'auto',
    routing_preference VARCHAR(50) DEFAULT 'balanced',
    voice_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
