-- Fix function search path security issues
DROP FUNCTION IF EXISTS public.update_user_points(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_challenge_leaderboard(UUID);

-- Recreate function to update user points with secure search path
CREATE OR REPLACE FUNCTION public.update_user_points(user_uuid UUID, points_to_add INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_points (user_id, points)
  VALUES (user_uuid, points_to_add)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    points = user_points.points + points_to_add,
    updated_at = now();
END;
$$;

-- Recreate function to get user leaderboard for a challenge with secure search path  
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(challenge_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  points_earned INTEGER,
  progress INTEGER,
  rank INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    uc.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Anonymous') as username,
    uc.points_earned,
    uc.progress,
    ROW_NUMBER() OVER (ORDER BY uc.points_earned DESC, uc.progress DESC) as rank
  FROM public.user_challenges uc
  LEFT JOIN public.profiles p ON uc.user_id = p.user_id
  WHERE uc.challenge_id = challenge_uuid
  ORDER BY uc.points_earned DESC, uc.progress DESC
  LIMIT 10;
$$;