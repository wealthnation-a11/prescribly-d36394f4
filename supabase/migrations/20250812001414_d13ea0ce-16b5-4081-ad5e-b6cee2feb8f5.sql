-- 1. Drop duplicate doctors_profile table since we have doctors table
DROP TABLE IF EXISTS public.doctors_profile CASCADE;

-- 2. Remove unused profile_id from doctors table (since it references non-existent data)
ALTER TABLE public.doctors DROP COLUMN IF EXISTS profile_id;

-- 3. Remove unused profile_id from patients table (since it references non-existent data)
ALTER TABLE public.patients DROP COLUMN IF EXISTS profile_id;

-- 4. Ensure all foreign keys reference user_id correctly
-- Update appointments to ensure proper relationships
-- No changes needed - already uses user_id correctly

-- 5. Update call_logs to match appointments table structure
-- Make sure doctor_id and patient_id are user_id references
-- No changes needed - already correct

-- 6. Update prescriptions to ensure proper relationships
-- No changes needed - already uses user_id correctly

-- 7. Ensure chats and messages use user_id consistently  
-- No changes needed - already correct

-- 8. Set all doctors to approved status for testing
UPDATE public.doctors 
SET verification_status = 'approved'::verification_status 
WHERE verification_status IS NULL OR verification_status != 'approved';

-- 9. Create indexes for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_chats_sender_id ON public.chats(sender_id);
CREATE INDEX IF NOT EXISTS idx_chats_recipient_id ON public.chats(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_doctor_id ON public.call_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_patient_id ON public.call_logs(patient_id);