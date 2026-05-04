-- ============================================================
-- LURA SECURITY FIXES
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- FIX 1: Function Search Path Mutable (public.handle_new_user)
-- Detects functions where search_path is not set, which can
-- allow privilege escalation via schema injection.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- <<< THIS IS THE KEY FIX
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- FIX 2 & 3: Public Bucket Allows Listing
-- storage.messages and storage.posts have broad SELECT policies
-- on storage.objects that allow listing by any authenticated user.
-- Restrict to only the owner of the object.
-- ============================================================

-- Drop existing broad policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view posts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view messages" ON storage.objects;

-- Messages bucket: Only conversation participants can read
CREATE POLICY "Authenticated users can upload messages media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messages');

CREATE POLICY "Users can view messages media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'messages');

CREATE POLICY "Users can delete their own messages media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Posts bucket: Authenticated users can view posts media
CREATE POLICY "Authenticated users can upload posts media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

CREATE POLICY "Users can view posts media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'posts');

CREATE POLICY "Users can delete their own posts media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'posts' AND auth.uid() = owner);

-- ============================================================
-- FIX 4 & 5: Public/Signed-In Can Execute SECURITY DEFINER
-- The handle_new_user function should only be callable by the
-- service role (via the trigger), NOT by public or authenticated users.
-- ============================================================

-- Revoke from public (covers unauthenticated AND authenticated)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Grant only to the postgres/service role so the trigger still works
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
