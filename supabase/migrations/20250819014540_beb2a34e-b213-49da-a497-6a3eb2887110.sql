-- Create user points table for gamification
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create challenges table for community health challenges
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration INTEGER NOT NULL, -- days
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  points_per_day INTEGER DEFAULT 5,
  total_points INTEGER DEFAULT 35, -- for 7-day challenge
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user challenges table for tracking participation
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  progress INTEGER DEFAULT 0, -- days completed
  points_earned INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active', -- active, completed, abandoned
  UNIQUE(user_id, challenge_id)
);

-- Create chat sessions table for AI Health Companion
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_data JSONB DEFAULT '{}',
  current_question TEXT,
  conversation_history JSONB DEFAULT '[]',
  diagnosis_result JSONB,
  confidence_score NUMERIC(3,2),
  status TEXT DEFAULT 'active', -- active, completed, abandoned
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points" ON public.user_points
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points" ON public.user_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for challenges
CREATE POLICY "Anyone can view active challenges" ON public.challenges
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can create challenges" ON public.challenges
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update challenges" ON public.challenges
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for user_challenges
CREATE POLICY "Users can view their own challenge participation" ON public.user_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join challenges" ON public.user_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their challenge progress" ON public.user_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert some sample challenges
INSERT INTO public.challenges (title, description, duration, start_date, end_date, points_per_day, total_points) VALUES
('7-Day Hydration Challenge', 'Drink at least 8 glasses of water daily for 7 consecutive days', 7, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 5, 35),
('Walk 5,000 Steps Daily', 'Complete 5,000 steps every day for a week to improve cardiovascular health', 7, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 10, 70),
('Meditation Mindfulness Week', 'Practice 10 minutes of meditation daily for mental wellness', 7, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 8, 56),
('Healthy Sleep Schedule', 'Get 7-8 hours of sleep daily for optimal health recovery', 7, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 6, 42);

-- Create function to update user points
CREATE OR REPLACE FUNCTION public.update_user_points(user_uuid UUID, points_to_add INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to get user leaderboard for a challenge
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