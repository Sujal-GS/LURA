-- Migration: Add Premium Content Features

-- 1. Add is_premium column to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- 2. Add premium status to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- 3. (Optional) Add razorpay customer tracking for profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- Update RLS policies to allow updating these columns
-- (Assuming users can update their own profile)
-- Depending on your existing RLS, you might need to adjust this so users can't just set their own `is_premium` to true directly via the client without the backend edge function.
-- But for the sake of frontend functionality right now, we ensure the column exists.

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
