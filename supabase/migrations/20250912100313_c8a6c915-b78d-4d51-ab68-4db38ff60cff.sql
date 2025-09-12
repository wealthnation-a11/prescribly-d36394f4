-- Insert test data for QA testing

INSERT INTO public.test_patients (test_name, test_symptoms, expected_conditions, expected_confidence_range, test_metadata, is_active) VALUES
  (
    'Common Cold Test', 
    ARRAY['runny nose', 'cough', 'sore throat', 'fatigue'],
    ARRAY['common cold', 'viral upper respiratory infection', 'rhinitis'],
    '[0.75,0.95]',
    '{"age": 25, "gender": "unknown", "severity": 3}',
    true
  ),
  (
    'Influenza Test',
    ARRAY['fever', 'body aches', 'headache', 'cough', 'fatigue'],
    ARRAY['influenza', 'flu', 'viral infection'],
    '[0.70,0.90]',
    '{"age": 35, "gender": "unknown", "severity": 6}',
    true
  ),
  (
    'Migraine Test',
    ARRAY['severe headache', 'nausea', 'sensitivity to light', 'throbbing pain'],
    ARRAY['migraine', 'headache disorder', 'primary headache'],
    '[0.80,0.95]',
    '{"age": 30, "gender": "female", "severity": 8}',
    true
  ),
  (
    'Gastroenteritis Test',
    ARRAY['nausea', 'vomiting', 'diarrhea', 'stomach pain'],
    ARRAY['gastroenteritis', 'stomach flu', 'viral gastroenteritis'],
    '[0.70,0.85]',
    '{"age": 40, "gender": "unknown", "severity": 5}',
    true
  ),
  (
    'Low Confidence Test',
    ARRAY['tired', 'feeling unwell'],
    ARRAY['fatigue', 'malaise'],
    '[0.20,0.60]',
    '{"age": 50, "gender": "unknown", "severity": 2}',
    true
  ),
  (
    'Emergency Test - Chest Pain',
    ARRAY['severe chest pain', 'shortness of breath', 'radiating pain to arm'],
    ARRAY['myocardial infarction', 'heart attack', 'acute coronary syndrome'],
    '[0.85,0.95]',
    '{"age": 60, "gender": "male", "severity": 9, "emergency_expected": true}',
    true
  );