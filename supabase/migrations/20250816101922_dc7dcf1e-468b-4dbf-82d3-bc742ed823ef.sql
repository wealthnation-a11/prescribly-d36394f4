-- Create symptom_vocab materialized view for autocomplete
CREATE MATERIALIZED VIEW symptom_vocab AS
SELECT DISTINCT jsonb_array_elements_text(symptoms) as symptom
FROM conditions
WHERE symptoms IS NOT NULL
UNION
SELECT DISTINCT name as symptom
FROM conditions
WHERE name IS NOT NULL;

-- Create index for faster autocomplete
CREATE INDEX idx_symptom_vocab_symptom ON symptom_vocab(symptom);

-- Create wellness_checks table
CREATE TABLE wellness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entered_symptoms TEXT[] NOT NULL,
  calculated_probabilities JSONB NOT NULL,
  suggested_drugs JSONB,
  age INTEGER,
  gender TEXT,
  duration TEXT,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create api_rate_limits table
CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE wellness_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for wellness_checks
CREATE POLICY "Users can insert their own wellness checks"
ON wellness_checks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own wellness checks"
ON wellness_checks FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for api_rate_limits
CREATE POLICY "Users can view their own rate limits"
ON api_rate_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert rate limits"
ON api_rate_limits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update rate limits"
ON api_rate_limits FOR UPDATE
USING (true);

-- RLS policies for conditions (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view conditions"
ON conditions FOR SELECT
USING (true);

-- Add index for better performance
CREATE INDEX idx_wellness_checks_user_id ON wellness_checks(user_id);
CREATE INDEX idx_api_rate_limits_user_id ON api_rate_limits(user_id, endpoint);
CREATE INDEX idx_conditions_symptoms ON conditions USING GIN(symptoms);