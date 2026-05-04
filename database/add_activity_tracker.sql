-- Add last_checked_activity to profiles for tracking unread notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_checked_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
