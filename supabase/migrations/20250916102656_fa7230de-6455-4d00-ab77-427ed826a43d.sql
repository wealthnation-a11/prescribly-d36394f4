-- Create user_assessments table for storing diagnosis history
CREATE TABLE IF NOT EXISTS public.user_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  condition_id INTEGER REFERENCES public.conditions(id),
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  answers JSONB NOT NULL DEFAULT '{}',
  recommended_drugs JSONB NOT NULL DEFAULT '[]',
  probability NUMERIC(4,3) DEFAULT NULL,
  session_id UUID DEFAULT NULL,
  reasoning TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_assessments
CREATE POLICY "Users can view their own assessments" 
ON public.user_assessments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessments" 
ON public.user_assessments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments" 
ON public.user_assessments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all assessments
CREATE POLICY "Admins can view all assessments" 
ON public.user_assessments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_assessments_updated_at
BEFORE UPDATE ON public.user_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_user_assessments_user_id ON public.user_assessments(user_id);
CREATE INDEX idx_user_assessments_created_at ON public.user_assessments(created_at DESC);