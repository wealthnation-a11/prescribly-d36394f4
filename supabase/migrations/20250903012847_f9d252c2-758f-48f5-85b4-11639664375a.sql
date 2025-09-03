-- Fix the function search path security issue
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
SECURITY DEFINER
SET search_path = public
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