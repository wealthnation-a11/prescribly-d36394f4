-- Create user_hydration_log table for tracking daily water intake
CREATE TABLE public.user_hydration_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses_drank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_hydration_log ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own hydration logs" 
ON public.user_hydration_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own hydration logs" 
ON public.user_hydration_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hydration logs" 
ON public.user_hydration_log 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate entries per user per day
ALTER TABLE public.user_hydration_log 
ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hydration_log_updated_at
BEFORE UPDATE ON public.user_hydration_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();