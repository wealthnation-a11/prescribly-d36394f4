-- Create proper schema for Bayesian diagnosis system

-- Add unique constraint to conditions.name 
ALTER TABLE conditions ADD CONSTRAINT conditions_name_unique UNIQUE (name);

-- Add unique constraint to symptoms.name
ALTER TABLE symptoms ADD CONSTRAINT symptoms_name_unique UNIQUE (name);

-- Create missing tables for advanced Bayesian diagnosis system

-- Condition Aliases table
CREATE TABLE IF NOT EXISTS condition_aliases (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(condition_id, alias)
);

-- Drug Recommendations table  
CREATE TABLE IF NOT EXISTS drug_recommendations (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dosage TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing tables
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS prevalence FLOAT DEFAULT 0.1;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS is_rare BOOLEAN DEFAULT FALSE;
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE condition_symptoms ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;

-- Enable RLS on new tables
ALTER TABLE condition_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view condition aliases" ON condition_aliases FOR SELECT USING (true);
CREATE POLICY "Anyone can view drug recommendations" ON drug_recommendations FOR SELECT USING (true);
CREATE POLICY "Admins manage aliases" ON condition_aliases FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins manage drugs" ON drug_recommendations FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));