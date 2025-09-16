-- Insert sample conditions with common symptoms for the diagnosis system to work properly

INSERT INTO conditions (id, name, description) VALUES 
(1, 'COVID-19', 'Viral respiratory infection caused by SARS-CoV-2'),
(2, 'Common Cold', 'Viral upper respiratory tract infection'),
(3, 'Influenza', 'Viral infection affecting the respiratory system'),
(4, 'Migraine', 'Severe recurring headaches often with nausea and light sensitivity'),
(5, 'Tension Headache', 'Most common type of headache caused by muscle tension'),
(6, 'Gastroenteritis', 'Inflammation of the stomach and intestines'),
(7, 'Food Poisoning', 'Illness caused by consuming contaminated food'),
(8, 'Urinary Tract Infection', 'Bacterial infection of the urinary system'),
(9, 'Pneumonia', 'Infection causing inflammation in the lungs'),
(10, 'Asthma', 'Chronic respiratory condition causing breathing difficulties'),
(11, 'Anxiety Disorder', 'Mental health condition causing excessive worry'),
(12, 'Depression', 'Mental health disorder affecting mood and daily functioning'),
(13, 'Hypertension', 'High blood pressure condition'),
(14, 'Diabetes Type 2', 'Chronic condition affecting blood sugar regulation'),
(15, 'Arthritis', 'Joint inflammation causing pain and stiffness'),
(16, 'Allergic Reaction', 'Immune system response to allergens'),
(17, 'Sinusitis', 'Inflammation of the sinus cavities'),
(18, 'Bronchitis', 'Inflammation of the bronchial tubes'),
(19, 'Conjunctivitis', 'Inflammation of the eye conjunctiva'),
(20, 'Dermatitis', 'Skin inflammation causing rash and itching')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Add common_symptoms column to conditions table if it doesn't exist
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS common_symptoms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS severity_level TEXT DEFAULT 'moderate';

-- Update conditions with common symptoms
UPDATE conditions SET 
  common_symptoms = '["fever", "cough", "sore throat", "fatigue", "headache", "loss of taste", "loss of smell", "shortness of breath"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'COVID-19';

UPDATE conditions SET 
  common_symptoms = '["runny nose", "congestion", "sneezing", "sore throat", "cough", "mild fever", "fatigue"]'::jsonb,
  severity_level = 'mild'
WHERE name = 'Common Cold';

UPDATE conditions SET 
  common_symptoms = '["fever", "chills", "body aches", "fatigue", "cough", "headache", "sore throat"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Influenza';

UPDATE conditions SET 
  common_symptoms = '["severe headache", "nausea", "vomiting", "light sensitivity", "sound sensitivity", "throbbing pain"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Migraine';

UPDATE conditions SET 
  common_symptoms = '["headache", "muscle tension", "mild pain", "pressure around head"]'::jsonb,
  severity_level = 'mild'
WHERE name = 'Tension Headache';

UPDATE conditions SET 
  common_symptoms = '["nausea", "vomiting", "diarrhea", "stomach pain", "fever", "fatigue"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Gastroenteritis';

UPDATE conditions SET 
  common_symptoms = '["nausea", "vomiting", "diarrhea", "stomach cramps", "fever", "headache"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Food Poisoning';

UPDATE conditions SET 
  common_symptoms = '["burning urination", "frequent urination", "cloudy urine", "strong urine odor", "pelvic pain"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Urinary Tract Infection';

UPDATE conditions SET 
  common_symptoms = '["cough", "fever", "shortness of breath", "chest pain", "fatigue", "chills"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Pneumonia';

UPDATE conditions SET 
  common_symptoms = '["wheezing", "shortness of breath", "chest tightness", "cough", "difficulty breathing"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Asthma';

UPDATE conditions SET 
  common_symptoms = '["excessive worry", "restlessness", "fatigue", "difficulty concentrating", "irritability", "sleep problems"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Anxiety Disorder';

UPDATE conditions SET 
  common_symptoms = '["persistent sadness", "loss of interest", "fatigue", "sleep problems", "appetite changes", "difficulty concentrating"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Depression';

UPDATE conditions SET 
  common_symptoms = '["high blood pressure", "headache", "dizziness", "chest pain", "shortness of breath"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Hypertension';

UPDATE conditions SET 
  common_symptoms = '["increased thirst", "frequent urination", "hunger", "fatigue", "blurred vision", "slow healing wounds"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Diabetes Type 2';

UPDATE conditions SET 
  common_symptoms = '["joint pain", "stiffness", "swelling", "warmth around joints", "reduced range of motion"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Arthritis';

UPDATE conditions SET 
  common_symptoms = '["itchy skin", "red skin", "rash", "swelling", "hives", "difficulty breathing"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Allergic Reaction';

UPDATE conditions SET 
  common_symptoms = '["facial pressure", "congestion", "runny nose", "headache", "fever", "thick nasal discharge"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Sinusitis';

UPDATE conditions SET 
  common_symptoms = '["persistent cough", "mucus production", "fatigue", "shortness of breath", "chest discomfort"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Bronchitis';

UPDATE conditions SET 
  common_symptoms = '["red eyes", "itchy eyes", "watery eyes", "discharge from eyes", "burning sensation"]'::jsonb,
  severity_level = 'mild'
WHERE name = 'Conjunctivitis';

UPDATE conditions SET 
  common_symptoms = '["itchy skin", "red skin", "dry skin", "rash", "inflammation", "burning sensation"]'::jsonb,
  severity_level = 'mild'
WHERE name = 'Dermatitis';