-- Allow users to delete conversations they are part of
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
CREATE POLICY "Users can delete their own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow users to delete messages in their conversations
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON messages;
CREATE POLICY "Users can delete messages in their conversations" ON messages
  FOR DELETE USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
