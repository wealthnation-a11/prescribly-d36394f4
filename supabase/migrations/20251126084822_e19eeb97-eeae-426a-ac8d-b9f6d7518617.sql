-- Add foreign key constraints to ensure proper connections between users, doctors, and herbal practitioners

-- 1. Add foreign keys for appointments table
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey,
DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;

ALTER TABLE appointments
ADD CONSTRAINT appointments_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
ADD CONSTRAINT appointments_doctor_id_fkey 
  FOREIGN KEY (doctor_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- 2. Add foreign keys for herbal_consultations table
ALTER TABLE herbal_consultations
DROP CONSTRAINT IF EXISTS herbal_consultations_patient_id_fkey,
DROP CONSTRAINT IF EXISTS herbal_consultations_practitioner_id_fkey;

ALTER TABLE herbal_consultations
ADD CONSTRAINT herbal_consultations_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
ADD CONSTRAINT herbal_consultations_practitioner_id_fkey 
  FOREIGN KEY (practitioner_id) REFERENCES herbal_practitioners(id) ON DELETE CASCADE;

-- 3. Add foreign keys for prescriptions table
ALTER TABLE prescriptions
DROP CONSTRAINT IF EXISTS prescriptions_patient_id_fkey,
DROP CONSTRAINT IF EXISTS prescriptions_doctor_id_fkey;

ALTER TABLE prescriptions
ADD CONSTRAINT prescriptions_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
ADD CONSTRAINT prescriptions_doctor_id_fkey 
  FOREIGN KEY (doctor_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- 4. Add comment explaining the relationships
COMMENT ON CONSTRAINT appointments_patient_id_fkey ON appointments IS 
  'Ensures appointments are linked to valid patient user profiles';
  
COMMENT ON CONSTRAINT appointments_doctor_id_fkey ON appointments IS 
  'Ensures appointments are linked to valid doctor user profiles';
  
COMMENT ON CONSTRAINT herbal_consultations_patient_id_fkey ON herbal_consultations IS 
  'Ensures consultations are linked to valid patient user profiles';
  
COMMENT ON CONSTRAINT herbal_consultations_practitioner_id_fkey ON herbal_consultations IS 
  'Ensures consultations are linked to valid herbal practitioner records';

COMMENT ON CONSTRAINT prescriptions_patient_id_fkey ON prescriptions IS 
  'Ensures prescriptions are linked to valid patient user profiles';
  
COMMENT ON CONSTRAINT prescriptions_doctor_id_fkey ON prescriptions IS 
  'Ensures prescriptions are linked to valid doctor user profiles';