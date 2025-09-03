-- Create user diagnosis history table
CREATE TABLE IF NOT EXISTS user_diagnosis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms TEXT[],
  diagnosis TEXT,
  drug TEXT,
  dosage TEXT,
  instructions TEXT,
  precautions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_diagnosis_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own diagnosis history" 
ON user_diagnosis_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diagnosis history" 
ON user_diagnosis_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RPC function for clinical assessment
CREATE OR REPLACE FUNCTION diagnose_with_context(
  age INT,
  gender TEXT,
  severity INT,
  duration INT,
  symptoms TEXT[]
)
RETURNS TABLE (
  condition TEXT,
  drug TEXT,
  dosage TEXT,
  instructions TEXT,
  precautions TEXT,
  confidence NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name AS condition,
    c.drug_recommendations::text AS drug,
    'As prescribed' AS dosage,
    'Follow medical advice' AS instructions,
    'Consult healthcare provider' AS precautions,
    (array_length(symptoms, 1) * 0.2 + severity * 0.2 + (CASE WHEN duration > 7 THEN 0.1 ELSE 0 END))::NUMERIC AS confidence
  FROM conditions c
  WHERE c.symptoms::jsonb ?| symptoms;
END;
$$;