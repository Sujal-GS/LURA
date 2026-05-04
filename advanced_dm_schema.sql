-- 1. Add reply_to_id to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id);

-- 2. Create reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id)
);

-- 3. Enable RLS for reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their conversations" 
ON public.reactions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversations c ON m.conversation_id = c.id
        WHERE m.id = reactions.message_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

CREATE POLICY "Users can react to messages in their conversations" 
ON public.reactions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversations c ON m.conversation_id = c.id
        WHERE m.id = reactions.message_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    AND user_id = auth.uid()
);

CREATE POLICY "Users can remove their own reactions" 
ON public.reactions FOR DELETE 
USING (user_id = auth.uid());
