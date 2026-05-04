-- ============================================================
-- PHASE 1: Security Policies (Fixed)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Prevent users from self-escalating their own premium status
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (
      is_premium = (SELECT is_premium FROM profiles WHERE id = auth.uid())
      OR
      (SELECT is_premium FROM profiles WHERE id = auth.uid()) = true
    )
  );

-- 2. Anonymous posting support
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- 3. Block system
CREATE TABLE IF NOT EXISTS blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own blocks" ON blocks;
CREATE POLICY "Users manage their own blocks" ON blocks FOR ALL USING (auth.uid() = blocker_id);

-- 4. Report system
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert reports" ON reports;
CREATE POLICY "Users can insert reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 5. Profile view tracking (for premium feature)
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can log a profile view" ON profile_views;
CREATE POLICY "Anyone can log a profile view" ON profile_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
DROP POLICY IF EXISTS "Only viewed user can see their views" ON profile_views;
CREATE POLICY "Only viewed user can see their views" ON profile_views FOR SELECT USING (auth.uid() = viewed_id);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
