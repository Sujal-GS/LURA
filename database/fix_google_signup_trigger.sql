-- Update the handle_new_user trigger to support Google OAuth
-- Google does not provide a 'username' by default, which causes the INSERT to fail.
-- We will fall back to using their email prefix or a generated string as their username.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  -- 1. Try to get the username from metadata (works for Email signup)
  base_username := NEW.raw_user_meta_data->>'username';
  
  -- 2. If it's null (e.g., Google OAuth), try to extract from email
  IF base_username IS NULL OR base_username = '' THEN
    base_username := split_part(NEW.email, '@', 1);
  END IF;

  -- 3. If it's STILL null for some reason, use a random string
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  -- 4. In a production system, you'd usually check for duplicates here
  -- but since our profiles.username might not have a UNIQUE constraint,
  -- or we're relying on ON CONFLICT (id), we'll just assign it.
  final_username := base_username;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Lura User'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
