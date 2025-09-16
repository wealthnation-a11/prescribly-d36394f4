-- Create user_assessments table to store diagnosis interactions
CREATE TABLE public.user_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  condition_id INTEGER REFERENCES public.conditions(id),
  answers JSONB NOT NULL DEFAULT '{}',
  recommended_drugs JSONB NOT NULL DEFAULT '[]',
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  probability NUMERIC(5,2),
  session_id UUID,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for user_assessments
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

-- Create index for better performance
CREATE INDEX idx_user_assessments_user_id ON public.user_assessments(user_id);
CREATE INDEX idx_user_assessments_created_at ON public.user_assessments(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_user_assessments_updated_at
BEFORE UPDATE ON public.user_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();