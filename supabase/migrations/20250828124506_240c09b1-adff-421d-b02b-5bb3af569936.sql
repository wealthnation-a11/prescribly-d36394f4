-- Create comprehensive tables for enhanced steps challenge with GPS tracking

-- Drop existing step_logs table and create new user_steps table
DROP TABLE IF EXISTS step_logs;

-- User steps table for daily step tracking
CREATE TABLE public.user_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  step_count integer NOT NULL DEFAULT 0,
  calories_burned numeric(5,2) DEFAULT 0,
  distance_km numeric(10,3) DEFAULT 0,
  goal_reached boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, date)
);

-- User routes table for GPS tracking sessions
CREATE TABLE public.user_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  activity_id uuid DEFAULT gen_random_uuid(),
  route_data jsonb, -- GeoJSON data for the route
  total_distance_km numeric(10,3) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 0,
  avg_pace_min_per_km numeric(5,2), -- Average pace in minutes per km
  calories_burned numeric(5,2) DEFAULT 0,
  steps_during_activity integer DEFAULT 0,
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  activity_type text NOT NULL DEFAULT 'walk',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User achievements table for gamification
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  date_awarded timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Prevent duplicate badges of same type for same user
  UNIQUE(user_id, badge_type)
);

-- Enable RLS on all tables
ALTER TABLE public.user_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_steps
CREATE POLICY "Users can view their own steps" 
ON public.user_steps 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own step logs" 
ON public.user_steps 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own step logs" 
ON public.user_steps 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for user_routes
CREATE POLICY "Users can view their own routes" 
ON public.user_routes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routes" 
ON public.user_routes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routes" 
ON public.user_routes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for user_achievements  
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_user_steps_updated_at
BEFORE UPDATE ON public.user_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_routes_updated_at
BEFORE UPDATE ON public.user_routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to award achievements based on step milestones
CREATE OR REPLACE FUNCTION public.check_and_award_step_achievements(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_goal_days integer;
    current_streak integer;
    today_steps integer;
BEGIN
    -- Get today's steps
    SELECT step_count INTO today_steps
    FROM public.user_steps
    WHERE user_id = user_uuid AND date = CURRENT_DATE;
    
    -- Award daily goal achievement
    IF today_steps >= 5000 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'daily_goal', 'Daily Walker', 'Completed 5,000 steps in a day')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    -- Calculate current streak
    WITH streak_calc AS (
        SELECT 
            date,
            goal_reached,
            ROW_NUMBER() OVER (ORDER BY date DESC) as rn,
            date = CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY date DESC) - 1) as is_consecutive
        FROM public.user_steps
        WHERE user_id = user_uuid AND goal_reached = true
        ORDER BY date DESC
    )
    SELECT COUNT(*) INTO current_streak
    FROM streak_calc
    WHERE is_consecutive = true;
    
    -- Award streak achievements
    IF current_streak >= 7 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'week_streak', 'Week Warrior', 'Maintained a 7-day walking streak')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    IF current_streak >= 30 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'monthly_streak', 'Step Master', 'Maintained a 30-day walking streak')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    -- Count total goal completion days
    SELECT COUNT(*) INTO total_goal_days
    FROM public.user_steps
    WHERE user_id = user_uuid AND goal_reached = true;
    
    -- Award milestone achievements
    IF total_goal_days >= 100 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'hundred_days', 'Century Walker', 'Completed 100 days of step goals')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
END;
$function$;