ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_accepted_terms BOOLEAN DEFAULT false;
