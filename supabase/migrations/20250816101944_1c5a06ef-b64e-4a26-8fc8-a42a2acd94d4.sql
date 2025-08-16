-- Hide symptom_vocab from API by adding it to the block list
ALTER MATERIALIZED VIEW symptom_vocab SET (security_barrier = false);

-- Create a function to access symptom vocab data instead of exposing the view
CREATE OR REPLACE FUNCTION get_symptom_suggestions(search_term TEXT DEFAULT '')
RETURNS TABLE(symptom TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT sv.symptom
  FROM symptom_vocab sv
  WHERE sv.symptom ILIKE '%' || search_term || '%'
  ORDER BY sv.symptom
  LIMIT 50;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION get_symptom_suggestions TO authenticated;