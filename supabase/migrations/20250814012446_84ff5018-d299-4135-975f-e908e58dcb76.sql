-- Create wellness_check_results table
CREATE TABLE IF NOT EXISTS public.wellness_check_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_info JSONB,
  symptoms TEXT[],
  diagnosis TEXT,
  prescription JSONB,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wellness_check_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own wellness check results" 
ON public.wellness_check_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wellness check results" 
ON public.wellness_check_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wellness check results" 
ON public.wellness_check_results 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wellness_check_results_updated_at
BEFORE UPDATE ON public.wellness_check_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();