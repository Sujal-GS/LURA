-- Add pinning support to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add a comment to the table
COMMENT ON COLUMN messages.is_pinned IS 'Whether the message is pinned in the chat';
