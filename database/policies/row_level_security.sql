-- GAAI Row Level Security (RLS) Policies for Supabase

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own display name and avatar"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Credit Ledger policies
-- Users can SELECT their own transactions, but cannot direct-INSERT/UPDATE/DELETE.
-- Only server (service_role) or securely triggered functions can manipulate the ledger.
CREATE POLICY "Users can view own credit ledger"
    ON credit_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Daily Grants policies
CREATE POLICY "Users can view own daily grants"
    ON daily_grants FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Game Sessions policies
CREATE POLICY "Users can view own game sessions"
    ON game_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- 5. User Settings policies
CREATE POLICY "Users can view and edit own settings"
    ON user_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
