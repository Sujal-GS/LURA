-- Create saved_posts table
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own saved posts" ON saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saved posts" ON saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved posts" ON saved_posts FOR DELETE USING (auth.uid() = user_id);
