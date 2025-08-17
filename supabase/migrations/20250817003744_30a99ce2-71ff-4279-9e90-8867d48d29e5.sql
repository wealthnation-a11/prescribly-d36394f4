-- Add drug_usage field to conditions table
ALTER TABLE public.conditions 
ADD COLUMN drug_usage JSONB;

-- Update existing records with sample usage instructions
UPDATE public.conditions 
SET drug_usage = CASE 
  WHEN name = 'Common Cold' THEN '[{"drug": "Inhaled corticosteroids", "usage": "Use inhaler twice daily as directed"}, {"drug": "Bronchodilators", "usage": "Use as needed for breathing difficulties"}, {"drug": "Antihistamines", "usage": "Take 1 tablet daily with food"}]'::jsonb
  WHEN name = 'Asthma' THEN '[{"drug": "Inhaled corticosteroids", "usage": "Use inhaler twice daily as directed"}, {"drug": "Bronchodilators", "usage": "Use as needed for breathing difficulties"}, {"drug": "Antihistamines", "usage": "Take 1 tablet daily with food"}]'::jsonb
  WHEN name = 'Cystic Fibrosis' THEN '[{"drug": "Inhaled corticosteroids", "usage": "Use inhaler twice daily as directed"}, {"drug": "Bronchodilators", "usage": "Use as needed for breathing difficulties"}, {"drug": "Antihistamines", "usage": "Take 1 tablet daily with food"}]'::jsonb
  WHEN name = 'COVID-19' THEN '[{"drug": "Inhaled corticosteroids", "usage": "Use inhaler twice daily as directed"}, {"drug": "Bronchodilators", "usage": "Use as needed for breathing difficulties"}, {"drug": "Antihistamines", "usage": "Take 1 tablet daily with food"}]'::jsonb
  ELSE '[{"drug": "Consult your doctor", "usage": "Follow prescribed dosage and instructions"}]'::jsonb
END
WHERE drug_usage IS NULL;