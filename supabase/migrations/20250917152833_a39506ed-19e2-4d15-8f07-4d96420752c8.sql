-- Add is_legacy column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_legacy BOOLEAN DEFAULT FALSE;

-- Mark all existing users as legacy (created before today)
UPDATE public.profiles 
SET is_legacy = true 
WHERE created_at < '2025-09-18';