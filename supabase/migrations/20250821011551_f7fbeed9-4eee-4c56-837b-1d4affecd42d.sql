-- Add challenge_progress table for detailed daily tracking
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  status boolean NOT NULL DEFAULT false,
  data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id, day_number)
);

-- Enable RLS
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for challenge_progress
CREATE POLICY "Users can view their own progress" ON public.challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.challenge_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.challenge_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Add challenge_type column to challenges table if not exists
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS challenge_type text DEFAULT 'general';

-- Insert the 4 specific challenges
INSERT INTO public.challenges (title, description, duration, start_date, end_date, points_per_day, total_points, challenge_type, active) VALUES 
(
  '7-Day Hydration Challenge',
  'Drink 8 glasses of water daily for a week. Track each glass and build a healthy hydration habit.',
  7,
  CURRENT_DATE,
  CURRENT_DATE + interval '7 days',
  10,
  70,
  'hydration',
  true
),
(
  'Walk 5,000 Steps Daily',
  'Achieve 5,000 steps every day for 30 days. Input your daily step count and stay active.',
  30,
  CURRENT_DATE,
  CURRENT_DATE + interval '30 days',
  10,
  300,
  'steps',
  true
),
(
  'Meditation & Mindfulness',
  'Practice daily meditation for 7 days. Get inspired by daily prompts and track your mindfulness journey.',
  7,
  CURRENT_DATE,
  CURRENT_DATE + interval '7 days',
  10,
  70,
  'meditation',
  true
),
(
  'Healthy Sleep Schedule',
  'Maintain 7+ hours of sleep for 14 days. Log your bedtime and wake-up time to build better sleep habits.',
  14,
  CURRENT_DATE,
  CURRENT_DATE + interval '14 days',
  10,
  140,
  'sleep',
  true
)
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_challenge_progress_updated_at
  BEFORE UPDATE ON public.challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();