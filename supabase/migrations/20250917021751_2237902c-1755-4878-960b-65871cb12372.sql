-- Create companion questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.companion_questions (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user daily check-ins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_daily_checkins (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id INTEGER REFERENCES public.companion_questions(id),
  answer TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.companion_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view companion questions" ON public.companion_questions;
DROP POLICY IF EXISTS "Users can create their own check-ins" ON public.user_daily_checkins;
DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.user_daily_checkins;

-- RLS policies for companion_questions
CREATE POLICY "Anyone can view companion questions" 
ON public.companion_questions 
FOR SELECT 
USING (true);

-- RLS policies for user_daily_checkins
CREATE POLICY "Users can create their own check-ins" 
ON public.user_daily_checkins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own check-ins" 
ON public.user_daily_checkins 
FOR SELECT 
USING (auth.uid() = user_id);

-- Clear existing questions first
DELETE FROM public.companion_questions;

-- Insert the health companion questions
INSERT INTO public.companion_questions (category, question_text) VALUES
('sleep', 'How many hours did you sleep last night?'),
('hydration', 'Did you drink at least 8 glasses of water today?'),
('exercise', 'Did you exercise today (at least 20 minutes)?'),
('nutrition', 'Did you eat any fruits or vegetables today?'),
('medication', 'Did you skip any of your prescribed medications today?'),
('energy', 'How is your current energy level? (low/medium/high)'),
('stress', 'Have you felt unusually stressed in the past 24 hours?'),
('screen_time', 'Did you limit your screen time before bed last night?'),
('pain', 'Have you experienced pain or discomfort today?'),
('diet', 'Did you take any sugary drinks today?'),
('outdoor', 'Did you spend at least 10 minutes outdoors today?'),
('nutrition_breakfast', 'Did you eat a balanced breakfast today?'),
('mental_health', 'Have you felt sad, anxious, or down in the past 24 hours?'),
('vitals', 'Did you check your weight or blood pressure recently?'),
('overall', 'Overall, how would you rate your health today (1–5)?'),
('water_intake', 'How many glasses of water have you had so far today?'),
('mood', 'How would you describe your mood today?'),
('social', 'Did you have meaningful social interactions today?'),
('mindfulness', 'Did you practice any relaxation or mindfulness today?'),
('symptoms', 'Are you experiencing any concerning symptoms today?');

-- Create or replace function to get daily questions for user
CREATE OR REPLACE FUNCTION public.get_daily_questions_for_user(user_uuid UUID)
RETURNS TABLE(id INTEGER, category TEXT, question_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Get 4-5 random questions that user hasn't answered today
  RETURN QUERY
  SELECT cq.id, cq.category, cq.question_text
  FROM public.companion_questions cq
  WHERE cq.id NOT IN (
    SELECT udc.question_id
    FROM public.user_daily_checkins udc
    WHERE udc.user_id = user_uuid
    AND udc.date = CURRENT_DATE
  )
  ORDER BY RANDOM()
  LIMIT 5; -- Return 5 questions per day for more engagement
END;
$function$;