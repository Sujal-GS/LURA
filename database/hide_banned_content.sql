-- 1. Helper function to check if a specific user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(target_uid UUID) 
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE id = target_uid), false);
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Update Posts policy to hide content from banned users
-- This ensures their posts are NOT visible in the feed or on profiles
DROP POLICY IF EXISTS "Public can view posts" ON public.posts;
CREATE POLICY "Public can view posts" ON public.posts
FOR SELECT TO authenticated
USING (
  (NOT public.is_user_banned(user_id)) -- Hide if the author is banned
  OR 
  public.is_admin() -- Administrators can still see everything for moderation
);

-- 3. Optional: Also hide stories from banned users
DROP POLICY IF EXISTS "Public can view stories" ON public.stories;
CREATE POLICY "Public can view stories" ON public.stories
FOR SELECT TO authenticated
USING (
  (NOT public.is_user_banned(user_id))
  OR 
  public.is_admin()
);
