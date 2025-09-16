-- Add common_symptoms column to conditions table if it doesn't exist
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS common_symptoms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE conditions ADD COLUMN IF NOT EXISTS severity_level TEXT DEFAULT 'moderate';

-- Update existing conditions with common symptoms
UPDATE conditions SET 
  common_symptoms = '["fever", "cough", "sore throat", "fatigue", "headache", "loss of taste", "loss of smell", "shortness of breath"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'COVID-19';

UPDATE conditions SET 
  common_symptoms = '["fever", "chills", "sweats", "headache", "muscle aches", "nausea", "vomiting"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Malaria';

UPDATE conditions SET 
  common_symptoms = '["prolonged fever", "headache", "weakness", "stomach pain", "diarrhea", "loss of appetite"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Typhoid Fever';

UPDATE conditions SET 
  common_symptoms = '["persistent cough", "weight loss", "night sweats", "fever", "fatigue", "chest pain"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Tuberculosis';

UPDATE conditions SET 
  common_symptoms = '["cough", "fever", "shortness of breath", "chest pain", "fatigue", "chills"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Pneumonia';

UPDATE conditions SET 
  common_symptoms = '["high blood pressure", "headache", "dizziness", "chest pain", "shortness of breath"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Hypertension';

UPDATE conditions SET 
  common_symptoms = '["increased thirst", "frequent urination", "hunger", "fatigue", "blurred vision", "slow healing wounds"]'::jsonb,
  severity_level = 'high'
WHERE name = 'Diabetes Mellitus';

UPDATE conditions SET 
  common_symptoms = '["wheezing", "shortness of breath", "chest tightness", "cough", "difficulty breathing"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Asthma';

UPDATE conditions SET 
  common_symptoms = '["fever", "fatigue", "weight loss", "night sweats", "opportunistic infections", "swollen lymph nodes"]'::jsonb,
  severity_level = 'high'
WHERE name = 'HIV/AIDS';

UPDATE conditions SET 
  common_symptoms = '["nausea", "vomiting", "diarrhea", "stomach pain", "fever", "fatigue"]'::jsonb,
  severity_level = 'moderate'
WHERE name = 'Gastroenteritis';

-- Add some sample drugs for common conditions
INSERT INTO drugs (id, condition_id, drug_name, rxnorm_id, strength, form, dosage, notes, category) VALUES 
(1, 9, 'Acetaminophen', '161', '500mg', 'Tablet', 'Take 1-2 tablets every 4-6 hours as needed', 'For fever and pain relief. Do not exceed 4000mg in 24 hours.', 'Pain Relief'),
(2, 9, 'Ibuprofen', '5640', '200mg', 'Tablet', 'Take 1-2 tablets every 6-8 hours with food', 'Anti-inflammatory for fever and pain. Take with food to avoid stomach irritation.', 'Anti-inflammatory'),
(3, 4, 'Amoxicillin', '723', '500mg', 'Capsule', 'Take 1 capsule 3 times daily for 7-10 days', 'Antibiotic for bacterial pneumonia. Complete full course even if feeling better.', 'Antibiotic'),
(4, 7, 'Albuterol', '435', '100mcg', 'Inhaler', '1-2 puffs every 4-6 hours as needed', 'Bronchodilator for asthma. Rinse mouth after use.', 'Bronchodilator'),
(5, 5, 'Lisinopril', '29046', '10mg', 'Tablet', 'Take 1 tablet once daily', 'ACE inhibitor for high blood pressure. Monitor blood pressure regularly.', 'ACE Inhibitor'),
(6, 6, 'Metformin', '6809', '500mg', 'Tablet', 'Take 1 tablet twice daily with meals', 'For type 2 diabetes. Take with food to reduce stomach upset.', 'Antidiabetic'),
(7, 10, 'Ondansetron', '7054', '4mg', 'Tablet', 'Take 1 tablet every 8 hours as needed for nausea', 'Anti-nausea medication for gastroenteritis.', 'Antiemetic'),
(8, 1, 'Chloroquine', '2393', '250mg', 'Tablet', 'Take as prescribed by physician for malaria treatment', 'Antimalarial medication. Follow prescribed regimen exactly.', 'Antimalarial'),
(9, 3, 'Isoniazid', '6038', '300mg', 'Tablet', 'Take 1 tablet daily on empty stomach', 'Anti-tuberculosis medication. Take 1 hour before or 2 hours after meals.', 'Anti-TB'),
(10, 2, 'Ciprofloxacin', '2551', '500mg', 'Tablet', 'Take 1 tablet twice daily for 7-14 days', 'Antibiotic for typhoid fever. Complete full course of treatment.', 'Antibiotic')
ON CONFLICT (id) DO UPDATE SET
  drug_name = EXCLUDED.drug_name,
  rxnorm_id = EXCLUDED.rxnorm_id,
  strength = EXCLUDED.strength,
  form = EXCLUDED.form,
  dosage = EXCLUDED.dosage,
  notes = EXCLUDED.notes,
  category = EXCLUDED.category;