-- Create step_logs table for tracking daily steps
CREATE TABLE public.step_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  steps integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for step_logs
CREATE POLICY "Users can view their own step logs" 
ON public.step_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own step logs" 
ON public.step_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own step logs" 
ON public.step_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create badges table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  earned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on badges table
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Create policies for badges
CREATE POLICY "Users can view their own badges" 
ON public.user_badges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own badges" 
ON public.user_badges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for step_logs updated_at
CREATE TRIGGER update_step_logs_updated_at
BEFORE UPDATE ON public.step_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();