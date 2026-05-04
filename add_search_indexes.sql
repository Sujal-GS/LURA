-- ============================================================
-- PHASE 2: Full-Text Search Indexes + Feed Ranking
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Full-text search index on profiles.username
CREATE INDEX IF NOT EXISTS profiles_username_fts 
  ON profiles USING gin(to_tsvector('english', username));

-- 2. Full-text search index on profiles.full_name
CREATE INDEX IF NOT EXISTS profiles_fullname_fts 
  ON profiles USING gin(to_tsvector('english', coalesce(full_name, '')));

-- 3. Full-text search index on posts.caption
CREATE INDEX IF NOT EXISTS posts_caption_fts 
  ON posts USING gin(to_tsvector('english', coalesce(caption, '')));

-- 4. Add likes_count column to posts for fast feed ranking
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;

-- 5. Backfill likes_count from existing likes data
UPDATE posts p
SET likes_count = (
  SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id
);

-- 6. Trigger function to keep likes_count in sync automatically
CREATE OR REPLACE FUNCTION sync_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Attach trigger to likes table
DROP TRIGGER IF EXISTS sync_likes_count_trigger ON likes;
CREATE TRIGGER sync_likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION sync_likes_count();

-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';
