-- Fix remaining security issues from linter (excluding symptom_vocab function)

-- 1. Fix functions without proper search_path
CREATE OR REPLACE FUNCTION public.update_user_points(user_uuid uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_points (user_id, points)
  VALUES (user_uuid, points_to_add)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    points = user_points.points + points_to_add,
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(challenge_uuid uuid)
RETURNS TABLE(user_id uuid, username text, points_earned integer, progress integer, rank integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    uc.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Anonymous') as username,
    uc.points_earned,
    uc.progress,
    ROW_NUMBER() OVER (ORDER BY uc.points_earned DESC, uc.progress DESC) as rank
  FROM public.user_challenges uc
  LEFT JOIN public.profiles p ON uc.user_id = p.user_id
  WHERE uc.challenge_id = challenge_uuid
  ORDER BY uc.points_earned DESC, uc.progress DESC
  LIMIT 10;
$function$;

CREATE OR REPLACE FUNCTION public.validate_encrypted_content(content text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN content IS NOT NULL AND length(content) > 32 AND content ~ '^[A-Za-z0-9+/=]+$';
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_encryption_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.encrypted_message IS NOT NULL OR NEW.encrypted_message_text IS NOT NULL THEN
        INSERT INTO encrypted_message_audit (
            table_name, 
            record_id, 
            action, 
            user_id, 
            encryption_version
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            auth.uid(),
            COALESCE(NEW.encryption_version, 1)
        );
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_questions_for_user(user_uuid uuid)
RETURNS TABLE(id integer, category text, question_text text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT cq.id, cq.category, cq.question_text
  FROM public.companion_questions cq
  WHERE cq.id NOT IN (
    SELECT udc.question_id
    FROM public.user_daily_checkins udc
    WHERE udc.user_id = user_uuid
    AND udc.date = CURRENT_DATE
  )
  ORDER BY RANDOM()
  LIMIT 5;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(user_uuid uuid, endpoint_name text, max_requests integer DEFAULT 10, window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := date_trunc('hour', now()) + 
    (EXTRACT(MINUTE FROM now())::INTEGER / window_minutes) * (window_minutes || ' minutes')::INTERVAL;
  
  SELECT COALESCE(request_count, 0) INTO current_count
  FROM public.api_rate_limits_enhanced
  WHERE user_id = user_uuid 
    AND endpoint = endpoint_name
    AND window_start = window_start_time;
  
  IF current_count >= max_requests THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.api_rate_limits_enhanced (user_id, endpoint, request_count, window_start)
  VALUES (user_uuid, endpoint_name, 1, window_start_time)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits_enhanced.request_count + 1;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_monitoring_event(event_type_param text, entity_id_param uuid, event_data_param jsonb, success_param boolean DEFAULT true, error_message_param text DEFAULT NULL::text, latency_ms_param integer DEFAULT NULL::integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.monitoring_logs (
    event_type,
    entity_id,
    event_data,
    success,
    error_message,
    latency_ms
  ) VALUES (
    event_type_param,
    entity_id_param,
    event_data_param,
    success_param,
    error_message_param,
    latency_ms_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  error_rate NUMERIC;
  rejection_rate NUMERIC;
  avg_response_time NUMERIC;
  alert_data JSONB := '{}';
  alerts_triggered INTEGER := 0;
BEGIN
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE success = false) * 100.0 / COUNT(*))
    END INTO error_rate
  FROM public.monitoring_logs
  WHERE event_type = 'api_call' 
    AND created_at >= now() - INTERVAL '1 hour';
  
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE override_type IN ('complete_rejection', 'partial_modification')) * 100.0 / COUNT(*))
    END INTO rejection_rate
  FROM public.doctor_overrides
  WHERE created_at >= now() - INTERVAL '24 hours';
  
  SELECT COALESCE(AVG(latency_ms), 0) INTO avg_response_time
  FROM public.monitoring_logs
  WHERE event_type = 'api_call' 
    AND latency_ms IS NOT NULL
    AND created_at >= now() - INTERVAL '1 hour';
  
  IF error_rate > 5 THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, description, alert_data
    ) VALUES (
      'high_error_rate', 'high',
      'High API Error Rate Detected',
      'API error rate exceeded 5% threshold in the last hour',
      jsonb_build_object('error_rate', error_rate, 'threshold', 5, 'period', '1 hour')
    );
    alerts_triggered := alerts_triggered + 1;
  END IF;
  
  IF rejection_rate > 50 THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, description, alert_data
    ) VALUES (
      'high_rejection_rate', 'medium',
      'High AI Rejection Rate Detected',
      'Doctor rejection rate for AI recommendations exceeded 50% in the last 24 hours',
      jsonb_build_object('rejection_rate', rejection_rate, 'threshold', 50, 'period', '24 hours')
    );
    alerts_triggered := alerts_triggered + 1;
  END IF;
  
  IF avg_response_time > 5000 THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, description, alert_data
    ) VALUES (
      'performance_degradation', 'medium',
      'Slow API Response Times Detected',
      'Average API response time exceeded 5 seconds in the last hour',
      jsonb_build_object('avg_response_time_ms', avg_response_time, 'threshold_ms', 5000, 'period', '1 hour')
    );
    alerts_triggered := alerts_triggered + 1;
  END IF;
  
  alert_data := jsonb_build_object(
    'error_rate_percent', error_rate,
    'rejection_rate_percent', rejection_rate,
    'avg_response_time_ms', avg_response_time,
    'alerts_triggered', alerts_triggered,
    'checked_at', now()
  );
  
  RETURN alert_data;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_award_step_achievements(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_goal_days integer;
    current_streak integer;
    today_steps integer;
BEGIN
    SELECT step_count INTO today_steps
    FROM public.user_steps
    WHERE user_id = user_uuid AND date = CURRENT_DATE;
    
    IF today_steps >= 5000 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'daily_goal', 'Daily Walker', 'Completed 5,000 steps in a day')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    WITH streak_calc AS (
        SELECT 
            date,
            goal_reached,
            ROW_NUMBER() OVER (ORDER BY date DESC) as rn,
            date = CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY date DESC) - 1) as is_consecutive
        FROM public.user_steps
        WHERE user_id = user_uuid AND goal_reached = true
        ORDER BY date DESC
    )
    SELECT COUNT(*) INTO current_streak
    FROM streak_calc
    WHERE is_consecutive = true;
    
    IF current_streak >= 7 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'week_streak', 'Week Warrior', 'Maintained a 7-day walking streak')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    IF current_streak >= 30 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'monthly_streak', 'Step Master', 'Maintained a 30-day walking streak')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    SELECT COUNT(*) INTO total_goal_days
    FROM public.user_steps
    WHERE user_id = user_uuid AND goal_reached = true;
    
    IF total_goal_days >= 100 THEN
        INSERT INTO public.user_achievements (user_id, badge_type, badge_name, badge_description)
        VALUES (user_uuid, 'hundred_days', 'Century Walker', 'Completed 100 days of step goals')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
END;
$function$;