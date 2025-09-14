-- Drop System Assessment related tables and functions
DROP TABLE IF EXISTS public.assessment_questions CASCADE;
DROP TABLE IF EXISTS public.diagnosis_results CASCADE;
DROP TABLE IF EXISTS public.diagnosis_sessions CASCADE;
DROP TABLE IF EXISTS public.diagnosis_sessions_v2 CASCADE;

-- Drop any related functions
DROP FUNCTION IF EXISTS public.sanitize_input(text);
DROP FUNCTION IF EXISTS public.check_emergency_symptoms(text[]);
DROP FUNCTION IF EXISTS public.validate_ai_confidence(jsonb, numeric);
DROP FUNCTION IF EXISTS public.diagnose_with_context(integer, text, integer, integer, text[]);
DROP FUNCTION IF EXISTS public.diagnose_with_bayesian(text[], integer, text);

-- Clean up any orphaned references
DELETE FROM public.notifications WHERE type = 'diagnosis_update';
DELETE FROM public.ai_confidence_logs WHERE diagnosis_session_id NOT IN (SELECT id FROM public.diagnosis_sessions_v2);
DELETE FROM public.emergency_flags WHERE diagnosis_session_id NOT IN (SELECT id FROM public.diagnosis_sessions_v2);
DELETE FROM public.doctor_overrides WHERE diagnosis_session_id NOT IN (SELECT id FROM public.diagnosis_sessions_v2);
DELETE FROM public.audit_logs WHERE diagnosis_id NOT IN (SELECT id FROM public.diagnosis_sessions_v2);