-- Clean up duplicate conditions and create proper Bayesian schema

-- Remove duplicates from conditions table by keeping only the first occurrence
DELETE FROM conditions 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM conditions 
  GROUP BY name
);

-- Now add unique constraint
ALTER TABLE conditions ADD CONSTRAINT conditions_name_unique UNIQUE (name);
ALTER TABLE symptoms ADD CONSTRAINT symptoms_name_unique UNIQUE (name);

-- Seed comprehensive medical data for Bayesian analysis
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
('Depression', 'Mental health disorder affecting mood', 0.05, false),
('Sinusitis', 'Inflammation of sinus cavities', 0.11, false),
('Bronchitis', 'Inflammation of bronchial tubes', 0.07, false),
('Food Poisoning', 'Illness from contaminated food', 0.03, false),
('Allergic Rhinitis', 'Hay fever or seasonal allergies', 0.14, false),
('Tension Headache', 'Most common type of headache', 0.20, false)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  prevalence = EXCLUDED.prevalence,
  is_rare = EXCLUDED.is_rare;

-- Seed comprehensive symptoms
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
('Memory problems', 'Difficulty remembering or concentrating'),
('Nasal congestion', 'Blocked or stuffy nose'),
('Sneezing', 'Sudden explosive expulsion of air'),
('Wheezing', 'High-pitched whistling sound when breathing'),
('Back pain', 'Pain in the back or spine area'),
('Increased urination', 'More frequent need to urinate'),
('Excessive thirst', 'Unusual desire for fluids'),
('Blurred vision', 'Unclear or hazy eyesight'),
('Rapid heartbeat', 'Heart beating faster than normal'),
('Sweating', 'Excessive perspiration'),
('Constipation', 'Difficulty passing stools')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;