-- Clean up references to system assessment tables first
DELETE FROM public.notifications WHERE type = 'diagnosis_update';

-- Clean up references in related tables that might reference the diagnosis sessions
DELETE FROM public.ai_confidence_logs WHERE diagnosis_session_id IN (
  SELECT id FROM public.diagnosis_sessions_v2
  UNION ALL
  SELECT id FROM public.diagnosis_sessions
);

DELETE FROM public.emergency_flags WHERE diagnosis_session_id IN (
  SELECT id FROM public.diagnosis_sessions_v2
  UNION ALL  
  SELECT id FROM public.diagnosis_sessions
);

DELETE FROM public.doctor_overrides WHERE diagnosis_session_id IN (
  SELECT id FROM public.diagnosis_sessions_v2
  UNION ALL
  SELECT id FROM public.diagnosis_sessions
);

DELETE FROM public.audit_logs WHERE diagnosis_id IN (
  SELECT id FROM public.diagnosis_sessions_v2
  UNION ALL
  SELECT id FROM public.diagnosis_sessions
);

-- Now drop the System Assessment related tables
DROP TABLE IF EXISTS public.assessment_questions CASCADE;
DROP TABLE IF EXISTS public.diagnosis_results CASCADE;
DROP TABLE IF EXISTS public.diagnosis_sessions CASCADE;
DROP TABLE IF EXISTS public.diagnosis_sessions_v2 CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.sanitize_input(text);
DROP FUNCTION IF EXISTS public.check_emergency_symptoms(text[]);
DROP FUNCTION IF EXISTS public.validate_ai_confidence(jsonb, numeric);
DROP FUNCTION IF EXISTS public.diagnose_with_context(integer, text, integer, integer, text[]);
DROP FUNCTION IF EXISTS public.diagnose_with_bayesian(text[], integer, text);