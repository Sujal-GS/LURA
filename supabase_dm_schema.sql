-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- Ensure user1 is always the smaller UUID to prevent duplicate conversation rows between two users
    CONSTRAINT user1_less_than_user2 CHECK (user1_id < user2_id),
    UNIQUE (user1_id, user2_id)
);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', null)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- 3. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 5. RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

CREATE POLICY "Users can insert messages in their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read" 
ON public.messages FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

-- 6. Enable Realtime
-- This requires running through the dashboard UI or using the alter publication command
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 7. Create Storage Bucket for messages (media)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('messages', 'messages', true) 
ON CONFLICT (id) DO NOTHING;

-- 8. Storage RLS Policies
CREATE POLICY "Message media is publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'messages');

CREATE POLICY "Authenticated users can upload message media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'messages' AND auth.role() = 'authenticated');
