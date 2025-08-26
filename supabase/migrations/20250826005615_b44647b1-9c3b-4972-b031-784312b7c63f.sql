-- Create missing tables for advanced Bayesian diagnosis system

-- Condition Aliases table
CREATE TABLE IF NOT EXISTS condition_aliases (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Update conditions table structure if needed
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS prevalence FLOAT DEFAULT 0.1;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS is_rare BOOLEAN DEFAULT FALSE;

-- Update symptoms table if needed  
ALTER TABLE symptoms ADD COLUMN IF NOT EXISTS description TEXT;

-- Update condition_symptoms to include weight column
ALTER TABLE condition_symptoms ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;

-- Seed conditions with Bayesian data
INSERT INTO conditions (name, description, prevalence, is_rare) VALUES
('Influenza', 'A viral infection that attacks your respiratory system', 0.15, false),
('Pneumonia', 'Infection that inflames the air sacs in one or both lungs', 0.05, false),
('Migraine', 'Intense headaches often accompanied by nausea', 0.10, false),
('Common Cold', 'Mild viral respiratory infection', 0.25, false),
('Gastroenteritis', 'Inflammation of stomach and intestines', 0.08, false),
('Hypertension', 'High blood pressure condition', 0.12, false),
('Type 2 Diabetes', 'Blood sugar regulation disorder', 0.09, false),
('Anxiety Disorder', 'Mental health condition with excessive worry', 0.07, false),
('Asthma', 'Chronic respiratory condition', 0.06, false),
('Depression', 'Mental health disorder affecting mood', 0.05, false)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  prevalence = EXCLUDED.prevalence,
  is_rare = EXCLUDED.is_rare;

-- Seed symptoms
INSERT INTO symptoms (name, description) VALUES
('Fever', 'High body temperature above normal'),
('Cough', 'Persistent coughing or throat irritation'),
('Headache', 'Pain in the head or upper neck region'),
('Fatigue', 'Extreme tiredness or lack of energy'),
('Nausea', 'Feeling of sickness or urge to vomit'),
('Shortness of breath', 'Difficulty breathing or feeling winded'),
('Chest pain', 'Pain or discomfort in chest area'),
('Abdominal pain', 'Pain in stomach or belly area'),
('Dizziness', 'Feeling lightheaded or unsteady'),
('Runny nose', 'Nasal discharge or congestion'),
('Sore throat', 'Pain or irritation in throat'),
('Muscle aches', 'Pain or soreness in muscles'),
('Loss of appetite', 'Reduced desire to eat'),
('Vomiting', 'Forceful emptying of stomach contents'),
('Diarrhea', 'Loose or watery stools'),
('Joint pain', 'Pain in joints or connective tissues'),
('Skin rash', 'Red, inflamed, or irritated skin'),
('Difficulty sleeping', 'Trouble falling or staying asleep'),
('Mood changes', 'Unusual changes in emotional state'),
('Memory problems', 'Difficulty remembering or concentrating')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Seed condition aliases
INSERT INTO condition_aliases (condition_id, alias) VALUES
((SELECT id FROM conditions WHERE name = 'Influenza'), 'Flu'),
((SELECT id FROM conditions WHERE name = 'Influenza'), 'Seasonal flu'),
((SELECT id FROM conditions WHERE name = 'Migraine'), 'Severe headache'),
((SELECT id FROM conditions WHERE name = 'Migraine'), 'Tension headache'),
((SELECT id FROM conditions WHERE name = 'Common Cold'), 'Cold'),
((SELECT id FROM conditions WHERE name = 'Common Cold'), 'Head cold'),
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), 'Stomach flu'),
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), 'Food poisoning'),
((SELECT id FROM conditions WHERE name = 'Hypertension'), 'High blood pressure'),
((SELECT id FROM conditions WHERE name = 'Type 2 Diabetes'), 'Diabetes'),
((SELECT id FROM conditions WHERE name = 'Anxiety Disorder'), 'Anxiety'),
((SELECT id FROM conditions WHERE name = 'Depression'), 'Clinical depression')
ON CONFLICT DO NOTHING;

-- Seed condition-symptom relationships with Bayesian weights
INSERT INTO condition_symptoms (condition_id, symptom_id, weight) VALUES
-- Influenza symptoms
((SELECT id FROM conditions WHERE name = 'Influenza'), (SELECT id FROM symptoms WHERE name = 'Fever'), 0.9),
((SELECT id FROM conditions WHERE name = 'Influenza'), (SELECT id FROM symptoms WHERE name = 'Cough'), 0.8),
((SELECT id FROM conditions WHERE name = 'Influenza'), (SELECT id FROM symptoms WHERE name = 'Fatigue'), 0.85),
((SELECT id FROM conditions WHERE name = 'Influenza'), (SELECT id FROM symptoms WHERE name = 'Muscle aches'), 0.75),
((SELECT id FROM conditions WHERE name = 'Influenza'), (SELECT id FROM symptoms WHERE name = 'Headache'), 0.7),

-- Pneumonia symptoms
((SELECT id FROM conditions WHERE name = 'Pneumonia'), (SELECT id FROM symptoms WHERE name = 'Cough'), 0.95),
((SELECT id FROM conditions WHERE name = 'Pneumonia'), (SELECT id FROM symptoms WHERE name = 'Fever'), 0.85),
((SELECT id FROM conditions WHERE name = 'Pneumonia'), (SELECT id FROM symptoms WHERE name = 'Shortness of breath'), 0.9),
((SELECT id FROM conditions WHERE name = 'Pneumonia'), (SELECT id FROM symptoms WHERE name = 'Chest pain'), 0.8),

-- Migraine symptoms  
((SELECT id FROM conditions WHERE name = 'Migraine'), (SELECT id FROM symptoms WHERE name = 'Headache'), 0.95),
((SELECT id FROM conditions WHERE name = 'Migraine'), (SELECT id FROM symptoms WHERE name = 'Nausea'), 0.8),
((SELECT id FROM conditions WHERE name = 'Migraine'), (SELECT id FROM symptoms WHERE name = 'Dizziness'), 0.6),

-- Common Cold symptoms
((SELECT id FROM conditions WHERE name = 'Common Cold'), (SELECT id FROM symptoms WHERE name = 'Runny nose'), 0.9),
((SELECT id FROM conditions WHERE name = 'Common Cold'), (SELECT id FROM symptoms WHERE name = 'Sore throat'), 0.85),
((SELECT id FROM conditions WHERE name = 'Common Cold'), (SELECT id FROM symptoms WHERE name = 'Cough'), 0.7),
((SELECT id FROM conditions WHERE name = 'Common Cold'), (SELECT id FROM symptoms WHERE name = 'Fatigue'), 0.6),

-- Gastroenteritis symptoms
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), (SELECT id FROM symptoms WHERE name = 'Nausea'), 0.9),
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), (SELECT id FROM symptoms WHERE name = 'Vomiting'), 0.85),
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), (SELECT id FROM symptoms WHERE name = 'Diarrhea'), 0.9),
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), (SELECT id FROM symptoms WHERE name = 'Abdominal pain'), 0.8)
ON CONFLICT (condition_id, symptom_id) DO UPDATE SET weight = EXCLUDED.weight;

-- Seed drug recommendations
INSERT INTO drug_recommendations (condition_id, drug_name, dosage, notes) VALUES
((SELECT id FROM conditions WHERE name = 'Influenza'), 'Oseltamivir (Tamiflu)', '75mg twice daily for 5 days', 'Most effective when started within 48 hours of symptom onset'),
((SELECT id FROM conditions WHERE name = 'Influenza'), 'Acetaminophen', '500-1000mg every 6 hours', 'For fever and body aches. Do not exceed 4g daily'),
((SELECT id FROM conditions WHERE name = 'Pneumonia'), 'Amoxicillin', '500mg three times daily for 7-10 days', 'First-line antibiotic for bacterial pneumonia'),
((SELECT id FROM conditions WHERE name = 'Pneumonia'), 'Azithromycin', '500mg on day 1, then 250mg daily for 4 days', 'Alternative for penicillin-allergic patients'),
((SELECT id FROM conditions WHERE name = 'Migraine'), 'Sumatriptan', '50-100mg as needed', 'Do not exceed 200mg per day. Avoid if cardiovascular disease'),
((SELECT id FROM conditions WHERE name = 'Migraine'), 'Ibuprofen', '400-600mg every 6 hours', 'Anti-inflammatory for pain relief'),
((SELECT id FROM conditions WHERE name = 'Common Cold'), 'Acetaminophen', '500mg every 6 hours as needed', 'For symptom relief only'),
((SELECT id FROM conditions WHERE name = 'Common Cold'), 'Dextromethorphan', '15mg every 4 hours', 'Cough suppressant - do not exceed 120mg daily'),
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), 'Oral Rehydration Solution', 'As needed for hydration', 'Essential to prevent dehydration'),
((SELECT id FROM conditions WHERE name = 'Gastroenteritis'), 'Loperamide', '2mg after each loose stool', 'For diarrhea control - maximum 16mg daily')
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE condition_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for condition_aliases  
CREATE POLICY "Authenticated users can view condition aliases" ON condition_aliases
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage condition aliases" ON condition_aliases  
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create RLS policies for drug_recommendations
CREATE POLICY "Authenticated users can view drug recommendations" ON drug_recommendations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doctors and admins can manage drug recommendations" ON drug_recommendations
  FOR ALL USING (has_role(auth.uid(), 'doctor'::user_role) OR has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'doctor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));