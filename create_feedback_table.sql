-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT CHECK (type IN ('feature', 'bug')) NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (so logged out users can also give feedback if needed, though we track user_id if present)
CREATE POLICY "Enable insert for everyone" ON public.feedback
    FOR INSERT WITH CHECK (true);

-- Only service role or authenticated admins (you) should read this
-- For now, we'll keep it simple: you can view it in the Supabase Dashboard
