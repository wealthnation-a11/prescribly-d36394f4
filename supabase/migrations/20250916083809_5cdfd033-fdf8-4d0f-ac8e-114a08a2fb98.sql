-- Fix security issues by enabling RLS on tables that don't have it

-- Enable RLS on conditions table
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;

-- Create policy for conditions (read-only for authenticated users)
CREATE POLICY "Authenticated users can view conditions" 
ON public.conditions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Enable RLS on clarifying_questions table  
ALTER TABLE public.clarifying_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for clarifying_questions (read-only for authenticated users)
CREATE POLICY "Authenticated users can view clarifying questions" 
ON public.clarifying_questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Enable RLS on drugs table
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;

-- Create policy for drugs (read-only for authenticated users)
CREATE POLICY "Authenticated users can view drugs" 
ON public.drugs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Enable RLS on diagnosis_history table
ALTER TABLE public.diagnosis_history ENABLE ROW LEVEL SECURITY;

-- Create policies for diagnosis_history
CREATE POLICY "Users can view their own diagnosis history" 
ON public.diagnosis_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diagnosis history" 
ON public.diagnosis_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);