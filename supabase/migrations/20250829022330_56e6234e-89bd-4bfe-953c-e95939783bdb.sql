-- Ensure conditions table has correct structure
ALTER TABLE conditions 
ADD COLUMN IF NOT EXISTS prevalence DOUBLE PRECISION DEFAULT 0.1,
ADD COLUMN IF NOT EXISTS is_rare BOOLEAN DEFAULT false;

-- Create condition_aliases table
CREATE TABLE IF NOT EXISTS condition_aliases (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update drug_recommendations table structure
DROP TABLE IF EXISTS drug_recommendations CASCADE;
CREATE TABLE drug_recommendations (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dosage TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update user_history table structure
DROP TABLE IF EXISTS user_history CASCADE;
CREATE TABLE user_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT,
  parsed_symptoms JSONB,
  suggested_conditions JSONB,
  confirmed_condition INTEGER REFERENCES conditions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE condition_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public read access to condition aliases" ON condition_aliases FOR SELECT USING (true);
CREATE POLICY "Public read access to drug recommendations" ON drug_recommendations FOR SELECT USING (true);
CREATE POLICY "Users can read their own history" ON user_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON user_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own analytics" ON analytics_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analytics" ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_condition_aliases_condition_id ON condition_aliases(condition_id);
CREATE INDEX IF NOT EXISTS idx_condition_aliases_alias ON condition_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_condition_symptoms_condition_id ON condition_symptoms(condition_id);
CREATE INDEX IF NOT EXISTS idx_condition_symptoms_symptom_id ON condition_symptoms(symptom_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_name ON symptoms(name);

-- Seed some basic data
INSERT INTO conditions (id, name, description, prevalence, is_rare) VALUES 
(1, 'Common Cold', 'Viral upper respiratory tract infection', 0.3, false),
(2, 'Influenza', 'Viral infection affecting respiratory system', 0.15, false),
(3, 'Tension Headache', 'Most common type of headache', 0.25, false),
(4, 'Migraine', 'Severe headache with additional symptoms', 0.12, false),
(5, 'Gastroenteritis', 'Inflammation of stomach and intestines', 0.08, false),
(6, 'Allergic Rhinitis', 'Allergic reaction affecting nose', 0.2, false),
(7, 'Sinusitis', 'Inflammation of sinus cavities', 0.1, false),
(8, 'Bronchitis', 'Inflammation of bronchial tubes', 0.06, false)
ON CONFLICT (id) DO NOTHING;

-- Seed condition aliases
INSERT INTO condition_aliases (condition_id, alias) VALUES 
(1, 'cold'), (1, 'runny nose'), (1, 'sniffles'),
(2, 'flu'), (2, 'influenza'),
(3, 'headache'), (3, 'head pain'),
(4, 'migraine'), (4, 'severe headache'),
(5, 'stomach bug'), (5, 'stomach flu'), (5, 'gastro'),
(6, 'hay fever'), (6, 'allergies'),
(7, 'sinus infection'), (7, 'sinus'),
(8, 'chest infection'), (8, 'bronchial infection')
ON CONFLICT DO NOTHING;

-- Seed basic symptoms
INSERT INTO symptoms (id, name, description) VALUES 
(gen_random_uuid(), 'headache', 'Pain in the head or neck area'),
(gen_random_uuid(), 'fever', 'Elevated body temperature'),
(gen_random_uuid(), 'cough', 'Forceful expulsion of air from lungs'),
(gen_random_uuid(), 'sore throat', 'Pain or irritation in throat'),
(gen_random_uuid(), 'fatigue', 'Extreme tiredness or exhaustion'),
(gen_random_uuid(), 'nausea', 'Feeling of sickness with urge to vomit'),
(gen_random_uuid(), 'runny nose', 'Nasal discharge'),
(gen_random_uuid(), 'body aches', 'General muscle or joint pain'),
(gen_random_uuid(), 'congestion', 'Blocked or stuffy nose'),
(gen_random_uuid(), 'diarrhea', 'Loose or watery bowel movements')
ON CONFLICT DO NOTHING;

-- Seed drug recommendations
INSERT INTO drug_recommendations (condition_id, drug_name, dosage, notes) VALUES 
(1, 'Paracetamol', '500mg every 4-6 hours', 'For pain and fever relief'),
(2, 'Ibuprofen', '400mg every 6-8 hours', 'Anti-inflammatory and fever reducer'),
(3, 'Paracetamol', '500mg every 4-6 hours', 'First-line treatment for tension headache'),
(4, 'Ibuprofen', '400mg at onset', 'Take at first sign of migraine'),
(5, 'Oral rehydration salts', 'As directed', 'Prevent dehydration'),
(6, 'Loratadine', '10mg once daily', 'Non-drowsy antihistamine'),
(7, 'Saline nasal spray', 'As needed', 'Helps clear sinuses'),
(8, 'Honey and lemon', '1 tsp honey in warm water', 'Soothes throat and cough')
ON CONFLICT DO NOTHING;