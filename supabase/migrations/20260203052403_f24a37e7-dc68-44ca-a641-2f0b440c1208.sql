-- User Sleep Log table for Sleep Challenge
CREATE TABLE IF NOT EXISTS public.user_sleep_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bedtime TEXT NOT NULL,
  wake_time TEXT NOT NULL,
  sleep_hours NUMERIC(4,2) NOT NULL,
  sleep_quality INTEGER NOT NULL DEFAULT 3,
  goal_reached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- User Mindfulness Log table for Mindfulness Challenge
CREATE TABLE IF NOT EXISTS public.user_mindfulness_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  goal_reached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- User Levels table for tracking user levels
CREATE TABLE IF NOT EXISTS public.user_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  level_name TEXT NOT NULL DEFAULT 'Beginner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_sleep_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mindfulness_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sleep_log
CREATE POLICY "Users can view their own sleep logs" ON public.user_sleep_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sleep logs" ON public.user_sleep_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sleep logs" ON public.user_sleep_log FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_mindfulness_log
CREATE POLICY "Users can view their own mindfulness logs" ON public.user_mindfulness_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mindfulness logs" ON public.user_mindfulness_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mindfulness logs" ON public.user_mindfulness_log FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_levels
CREATE POLICY "Users can view their own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own level" ON public.user_levels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);