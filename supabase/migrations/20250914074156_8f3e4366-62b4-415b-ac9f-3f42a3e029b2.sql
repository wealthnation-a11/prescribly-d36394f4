-- Update all conditions with proper common symptoms
UPDATE conditions SET common_symptoms = '["fatigue", "weakness", "pale skin", "shortness of breath", "cold hands and feet", "dizziness"]' WHERE name = 'Anemia';

UPDATE conditions SET common_symptoms = '["joint pain", "stiffness", "swelling", "reduced range of motion", "tenderness", "warmth around joints"]' WHERE name = 'Arthritis';

UPDATE conditions SET common_symptoms = '["wheezing", "shortness of breath", "chest tightness", "coughing", "difficulty breathing", "chest pain"]' WHERE name = 'Asthma';

UPDATE conditions SET common_symptoms = '["red eyes", "itchy eyes", "watery eyes", "discharge from eyes", "burning sensation", "light sensitivity"]' WHERE name = 'Conjunctivitis';

UPDATE conditions SET common_symptoms = '["fever", "cough", "shortness of breath", "fatigue", "body aches", "sore throat", "loss of taste", "loss of smell"]' WHERE name = 'COVID-19';

UPDATE conditions SET common_symptoms = '["persistent sadness", "loss of interest", "fatigue", "sleep problems", "appetite changes", "difficulty concentrating"]' WHERE name = 'Depression';

UPDATE conditions SET common_symptoms = '["itchy skin", "red skin", "dry skin", "rash", "swelling", "burning sensation"]' WHERE name = 'Dermatitis';

UPDATE conditions SET common_symptoms = '["increased thirst", "frequent urination", "hunger", "fatigue", "blurred vision", "slow healing wounds"]' WHERE name = 'Diabetes Mellitus Type 2';

UPDATE conditions SET common_symptoms = '["fatigue", "nausea", "vomiting", "abdominal pain", "loss of appetite", "dark urine", "pale stools", "jaundice"]' WHERE name = 'Hepatitis B';

UPDATE conditions SET common_symptoms = '["fever", "fatigue", "weight loss", "night sweats", "diarrhea", "opportunistic infections"]' WHERE name = 'HIV/AIDS';

UPDATE conditions SET common_symptoms = '["headache", "dizziness", "chest pain", "shortness of breath", "nosebleeds", "fatigue"]' WHERE name = 'Hypertension';

UPDATE conditions SET common_symptoms = '["fever", "chills", "headache", "muscle aches", "nausea", "vomiting", "sweating", "fatigue"]' WHERE name = 'Malaria';

UPDATE conditions SET common_symptoms = '["severe headache", "nausea", "vomiting", "light sensitivity", "sound sensitivity", "throbbing pain"]' WHERE name = 'Migraine';

UPDATE conditions SET common_symptoms = '["ear pain", "fever", "hearing problems", "ear discharge", "irritability", "difficulty sleeping"]' WHERE name = 'Otitis Media';

UPDATE conditions SET common_symptoms = '["stomach pain", "burning sensation", "nausea", "vomiting", "loss of appetite", "bloating", "heartburn"]' WHERE name = 'Peptic Ulcer';

UPDATE conditions SET common_symptoms = '["cough", "fever", "shortness of breath", "chest pain", "fatigue", "chills", "muscle aches"]' WHERE name = 'Pneumonia';

UPDATE conditions SET common_symptoms = '["sudden weakness", "speech problems", "vision problems", "severe headache", "dizziness", "loss of coordination"]' WHERE name = 'Stroke';

UPDATE conditions SET common_symptoms = '["persistent cough", "chest pain", "weight loss", "fatigue", "fever", "night sweats", "coughing up blood"]' WHERE name = 'Tuberculosis';

UPDATE conditions SET common_symptoms = '["high fever", "headache", "weakness", "stomach pain", "constipation", "diarrhea", "loss of appetite", "rash"]' WHERE name = 'Typhoid Fever';

UPDATE conditions SET common_symptoms = '["burning urination", "frequent urination", "cloudy urine", "strong urine odor", "pelvic pain", "fever"]' WHERE name = 'Urinary Tract Infection';