-- Policy to allow users with is_admin = true to view all feedback
CREATE POLICY "Allow admins to read feedback" ON public.feedback
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Also allow admins to delete feedback
CREATE POLICY "Allow admins to delete feedback" ON public.feedback
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );
