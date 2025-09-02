-- Add user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  path text NOT NULL DEFAULT 'entry', -- 'entry' | 'freeText' | 'picker' | 'guided' | 'results'
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed'
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add RLS policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own sessions" 
ON user_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own sessions" 
ON user_sessions 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own sessions" 
ON user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions (status);

-- Add trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram index for better alias searching
CREATE INDEX IF NOT EXISTS idx_conditions_aliases_alias_trgm 
ON conditions_aliases USING gin (aliases gin_trgm_ops);

-- Ensure drug_recommendations table exists with proper structure
CREATE TABLE IF NOT EXISTS drug_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id integer NOT NULL,
  drug_name text NOT NULL,
  dosage text,
  frequency text,
  duration text,
  notes text,
  is_prescription boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add RLS for drug_recommendations
ALTER TABLE drug_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drug recommendations" 
ON drug_recommendations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);