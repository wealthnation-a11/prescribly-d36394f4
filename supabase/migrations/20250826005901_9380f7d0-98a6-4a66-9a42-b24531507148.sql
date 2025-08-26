-- Create advanced Bayesian diagnosis schema (fixing syntax)

-- Remove duplicates from conditions table  
DELETE FROM conditions 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM conditions 
  GROUP BY name
);

-- Add columns to existing tables if they don't exist
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS prevalence FLOAT DEFAULT 0.1;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS is_rare BOOLEAN DEFAULT FALSE;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE condition_symptoms ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;

-- Drop constraints if they exist and recreate
DROP INDEX IF EXISTS conditions_name_idx;
CREATE UNIQUE INDEX conditions_name_idx ON conditions(name);

DROP INDEX IF EXISTS symptoms_name_idx;  
CREATE UNIQUE INDEX symptoms_name_idx ON symptoms(name);

-- Create missing tables
CREATE TABLE IF NOT EXISTS condition_aliases (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drug_recommendations (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dosage TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE condition_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_condition_aliases" ON condition_aliases;
CREATE POLICY "view_condition_aliases" ON condition_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "view_drug_recommendations" ON drug_recommendations;
CREATE POLICY "view_drug_recommendations" ON drug_recommendations FOR SELECT USING (true);