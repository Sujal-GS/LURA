-- Ensure RLS is enabled
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own posts." ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;

-- 2. Create a robust INSERT policy for authenticated users
CREATE POLICY "Users can insert their own posts" ON public.posts
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 3. Also ensure SELECT, UPDATE, and DELETE are solid
DROP POLICY IF EXISTS "Posts are viewable by everyone." ON public.posts;
DROP POLICY IF EXISTS "Public can view posts" ON public.posts;

-- Using the stealth moderation select policy
CREATE POLICY "Public can view posts" ON public.posts
FOR SELECT 
TO authenticated
USING (
  (NOT public.is_user_banned(user_id)) 
  OR 
  public.is_admin()
);

DROP POLICY IF EXISTS "Users can update their own posts." ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts." ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- ─── REPEAT FOR STORIES ───
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own stories." ON public.stories;
CREATE POLICY "Users can insert their own stories" ON public.stories
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view stories" ON public.stories;
CREATE POLICY "Public can view stories" ON public.stories
FOR SELECT 
TO authenticated
USING (
  (NOT public.is_user_banned(user_id))
  OR 
  public.is_admin()
);
