-- Phase 3: Premium Upgrades (Vault & Ghost Mode)

-- 1. Add ghost_mode and vault_pin to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS vault_pin TEXT;

-- 2. Create vault_media table for permanent storage of disappearing content
CREATE TABLE IF NOT EXISTS public.vault_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on vault_media
ALTER TABLE public.vault_media ENABLE ROW LEVEL SECURITY;

-- Policy: Only the owner can insert into their vault
DROP POLICY IF EXISTS "Users can insert into own vault" ON public.vault_media;
CREATE POLICY "Users can insert into own vault" ON public.vault_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Only the owner can view their vault media
DROP POLICY IF EXISTS "Users can view own vault media" ON public.vault_media;
CREATE POLICY "Users can view own vault media" ON public.vault_media
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only the owner can delete their vault media
DROP POLICY IF EXISTS "Users can delete own vault media" ON public.vault_media;
CREATE POLICY "Users can delete own vault media" ON public.vault_media
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
