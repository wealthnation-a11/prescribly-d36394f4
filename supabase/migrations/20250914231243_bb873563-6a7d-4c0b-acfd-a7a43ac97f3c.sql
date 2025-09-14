-- Create assessment_questions table
CREATE TABLE public.assessment_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    question TEXT NOT NULL,
    user_answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create diagnosis_results table
CREATE TABLE public.diagnosis_results (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    condition TEXT NOT NULL,
    probability FLOAT NOT NULL,
    explanation TEXT NOT NULL,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessment_questions
CREATE POLICY "Users can view their own questions" 
ON public.assessment_questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create questions" 
ON public.assessment_questions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their answers" 
ON public.assessment_questions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- RLS policies for diagnosis_results
CREATE POLICY "Users can view their own diagnosis results" 
ON public.diagnosis_results 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create diagnosis results" 
ON public.diagnosis_results 
FOR INSERT 
WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER update_assessment_questions_updated_at
BEFORE UPDATE ON public.assessment_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();