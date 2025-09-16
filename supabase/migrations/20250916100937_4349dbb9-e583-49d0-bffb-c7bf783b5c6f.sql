-- Update conditions 11-20 with complete symptom data for accurate diagnosis

UPDATE public.conditions 
SET common_symptoms = '["fever", "fatigue", "nausea", "vomiting", "abdominal pain", "dark urine", "jaundice"]'::jsonb
WHERE id = 11 AND name = 'Hepatitis B';

UPDATE public.conditions 
SET common_symptoms = '["severe diarrhea", "vomiting", "dehydration", "muscle cramps", "weakness", "thirst"]'::jsonb
WHERE id = 12 AND name = 'Cholera';

UPDATE public.conditions 
SET common_symptoms = '["fever", "cough", "runny nose", "red eyes", "skin rash", "muscle aches"]'::jsonb
WHERE id = 13 AND name = 'Measles';

UPDATE public.conditions 
SET common_symptoms = '["severe headache", "nausea", "vomiting", "sensitivity to light", "sensitivity to sound"]'::jsonb
WHERE id = 14 AND name = 'Migraine';

UPDATE public.conditions 
SET common_symptoms = '["persistent cough", "mucus production", "chest discomfort", "fatigue", "shortness of breath"]'::jsonb
WHERE id = 15 AND name = 'Bronchitis';

UPDATE public.conditions 
SET common_symptoms = '["stomach pain", "bloating", "heartburn", "nausea", "loss of appetite"]'::jsonb
WHERE id = 16 AND name = 'Peptic Ulcer Disease';

UPDATE public.conditions 
SET common_symptoms = '["fatigue", "weakness", "pale skin", "shortness of breath", "dizziness", "cold hands and feet"]'::jsonb
WHERE id = 17 AND name = 'Anemia';

UPDATE public.conditions 
SET common_symptoms = '["joint pain", "stiffness", "swelling", "reduced range of motion", "fatigue"]'::jsonb
WHERE id = 18 AND name = 'Arthritis';

UPDATE public.conditions 
SET common_symptoms = '["painful urination", "frequent urination", "cloudy urine", "pelvic pain", "fever"]'::jsonb
WHERE id = 19 AND name = 'Urinary Tract Infection';

UPDATE public.conditions 
SET common_symptoms = '["redness", "swelling", "warmth", "pain", "pus formation", "fever"]'::jsonb
WHERE id = 20 AND name = 'Skin Infection';