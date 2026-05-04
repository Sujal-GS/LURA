-- Update conversations to track unread state better
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_sender_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Update RLS for the new columns
-- (Already covered by existing policies as they allow selecting all columns)
