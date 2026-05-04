-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing admin update policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create a robust policy that allows admins to update any user's profile
-- We use a subquery to check the current user's admin status
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- Also ensure admins can READ all profiles to see the user list
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  auth.uid() = id
);
