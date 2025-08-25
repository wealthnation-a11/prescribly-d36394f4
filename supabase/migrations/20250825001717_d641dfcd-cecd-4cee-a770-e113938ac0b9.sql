-- Create missing tables for advanced Bayesian diagnosis engine

-- Create standardized symptoms table
CREATE TABLE public.symptoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  category TEXT,
  severity_weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create condition-symptom mapping with probabilities
CREATE TABLE public.condition_symptoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condition_id INTEGER NOT NULL,
  symptom_id UUID NOT NULL REFERENCES public.symptoms(id),
  probability NUMERIC NOT NULL DEFAULT 0.5, -- P(symptom | condition)
  weight NUMERIC DEFAULT 1.0, -- importance weight
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(condition_id, symptom_id)
);

-- Create user history for learning and personalization
CREATE TABLE public.user_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  symptoms_reported TEXT[],
  symptoms_parsed UUID[], -- references symptoms.id
  bayesian_results JSONB, -- top conditions with probabilities
  confirmed_condition TEXT,
  confirmed_by_doctor BOOLEAN DEFAULT false,
  user_demographics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for symptoms (public read, admin write)
CREATE POLICY "Authenticated users can view symptoms" 
ON public.symptoms FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage symptoms" 
ON public.symptoms FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS policies for condition_symptoms (public read, admin write)
CREATE POLICY "Authenticated users can view condition symptoms" 
ON public.condition_symptoms FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage condition symptoms" 
ON public.condition_symptoms FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS policies for user_history (users own their data)
CREATE POLICY "Users can view their own history" 
ON public.user_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own history" 
ON public.user_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history" 
ON public.user_history FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all history" 
ON public.user_history FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add indexes for performance
CREATE INDEX idx_condition_symptoms_condition ON public.condition_symptoms(condition_id);
CREATE INDEX idx_condition_symptoms_symptom ON public.condition_symptoms(symptom_id);
CREATE INDEX idx_user_history_user ON public.user_history(user_id);
CREATE INDEX idx_user_history_session ON public.user_history(session_id);
CREATE INDEX idx_symptoms_name ON public.symptoms(name);

-- Insert some sample symptoms for testing
INSERT INTO public.symptoms (name, aliases, category, severity_weight) VALUES
  ('headache', ARRAY['head pain', 'migraine', 'cephalgia'], 'neurological', 1.0),
  ('fever', ARRAY['high temperature', 'pyrexia', 'hot'], 'general', 1.5),
  ('cough', ARRAY['coughing', 'hack'], 'respiratory', 1.2),
  ('fatigue', ARRAY['tiredness', 'exhaustion', 'weakness'], 'general', 1.0),
  ('nausea', ARRAY['feeling sick', 'queasiness'], 'gastrointestinal', 1.3),
  ('chest pain', ARRAY['heart pain', 'thoracic pain'], 'cardiovascular', 2.0),
  ('shortness of breath', ARRAY['difficulty breathing', 'dyspnea', 'breathless'], 'respiratory', 1.8),
  ('dizziness', ARRAY['lightheaded', 'vertigo'], 'neurological', 1.2),
  ('abdominal pain', ARRAY['stomach pain', 'belly ache', 'tummy pain'], 'gastrointestinal', 1.4),
  ('joint pain', ARRAY['arthralgia', 'aching joints'], 'musculoskeletal', 1.1);

-- Add trigger for updated_at
CREATE TRIGGER update_user_history_updated_at
  BEFORE UPDATE ON public.user_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();