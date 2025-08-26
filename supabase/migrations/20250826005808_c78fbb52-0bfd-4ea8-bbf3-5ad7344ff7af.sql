-- Clean up and create proper Bayesian schema step by step

-- Remove duplicates from conditions table by keeping only the first occurrence
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

-- Add unique constraints
ALTER TABLE conditions ADD CONSTRAINT IF NOT EXISTS conditions_name_unique UNIQUE (name);
ALTER TABLE symptoms ADD CONSTRAINT IF NOT EXISTS symptoms_name_unique UNIQUE (name);

-- Create remaining tables
CREATE TABLE IF NOT EXISTS condition_aliases (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(condition_id, alias)
);

CREATE TABLE IF NOT EXISTS drug_recommendations (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dosage TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE condition_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_recommendations ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies - allow read access for all authenticated users
CREATE POLICY IF NOT EXISTS "Anyone can view condition aliases" ON condition_aliases FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can view drug recommendations" ON drug_recommendations FOR SELECT USING (true);