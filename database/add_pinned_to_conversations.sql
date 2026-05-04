-- Add pinning support to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Add a comment to the table
COMMENT ON COLUMN conversations.is_pinned IS 'Whether the conversation is pinned by the user';
COMMENT ON COLUMN conversations.pinned_at IS 'When the conversation was pinned';
