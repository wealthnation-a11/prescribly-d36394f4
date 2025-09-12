-- Validation and monitoring enhancements for Diagnostic System

-- Create monitoring logs table for analytics
CREATE TABLE public.monitoring_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('api_call', 'ai_response', 'user_activity', 'doctor_activity', 'performance_metric')),
  entity_id UUID, -- user_id, doctor_id, or session_id depending on event
  event_data JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on monitoring logs
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for monitoring logs - only admins and system can access
CREATE POLICY "Admins can view all monitoring logs"
  ON public.monitoring_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert monitoring logs"
  ON public.monitoring_logs
  FOR INSERT
  WITH CHECK (true);

-- Create system alerts table
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high_error_rate', 'high_rejection_rate', 'performance_degradation', 'system_failure')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  alert_data JSONB NOT NULL DEFAULT '{}',
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for system alerts - only admins can access
CREATE POLICY "Admins can view all system alerts"
  ON public.system_alerts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update system alerts"
  ON public.system_alerts
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can create system alerts"
  ON public.system_alerts
  FOR INSERT
  WITH CHECK (true);

-- Create AI confidence tracking table
CREATE TABLE public.ai_confidence_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_session_id UUID NOT NULL,
  ai_model TEXT NOT NULL,
  conditions_analyzed JSONB NOT NULL,
  highest_confidence NUMERIC(5,4) NOT NULL CHECK (highest_confidence >= 0 AND highest_confidence <= 1),
  average_confidence NUMERIC(5,4) NOT NULL CHECK (average_confidence >= 0 AND average_confidence <= 1),
  confidence_threshold NUMERIC(5,4) NOT NULL DEFAULT 0.70,
  passed_threshold BOOLEAN NOT NULL,
  override_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on AI confidence logs
ALTER TABLE public.ai_confidence_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for AI confidence logs
CREATE POLICY "Users can view confidence logs for their sessions"
  ON public.ai_confidence_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnosis_sessions_v2 ds
      WHERE ds.id = ai_confidence_logs.diagnosis_session_id
      AND ds.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view confidence logs for assigned sessions"
  ON public.ai_confidence_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'doctor'::user_role) AND
    EXISTS (
      SELECT 1 FROM public.diagnosis_sessions_v2 ds
      WHERE ds.id = ai_confidence_logs.diagnosis_session_id
      AND ds.status = 'pending'
    )
  );

CREATE POLICY "Admins can view all confidence logs"
  ON public.ai_confidence_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can create confidence logs"
  ON public.ai_confidence_logs
  FOR INSERT
  WITH CHECK (true);

-- Create doctor override tracking table
CREATE TABLE public.doctor_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_session_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  original_ai_conditions JSONB NOT NULL,
  doctor_modified_conditions JSONB NOT NULL,
  override_reason TEXT NOT NULL,
  confidence_before NUMERIC(5,4),
  confidence_after NUMERIC(5,4),
  override_type TEXT NOT NULL CHECK (override_type IN ('complete_rejection', 'partial_modification', 'condition_added', 'condition_removed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on doctor overrides
ALTER TABLE public.doctor_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for doctor overrides
CREATE POLICY "Doctors can view their own overrides"
  ON public.doctor_overrides
  FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Admins can view all doctor overrides"
  ON public.doctor_overrides
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can create doctor overrides"
  ON public.doctor_overrides
  FOR INSERT
  WITH CHECK (true);

-- Create performance metrics table
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('api_response_time', 'ai_processing_time', 'database_query_time', 'daily_counts')),
  endpoint TEXT,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('milliseconds', 'seconds', 'count', 'percentage')),
  metadata JSONB DEFAULT '{}',
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on performance metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance metrics - only admins can view
CREATE POLICY "Admins can view performance metrics"
  ON public.performance_metrics
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can create performance metrics"
  ON public.performance_metrics
  FOR INSERT
  WITH CHECK (true);

-- Create test patients table for QA
CREATE TABLE public.test_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_symptoms TEXT[] NOT NULL,
  expected_conditions TEXT[] NOT NULL,
  expected_confidence_range NUMRANGE NOT NULL,
  test_metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_tested_at TIMESTAMP WITH TIME ZONE,
  test_results JSONB DEFAULT '{}'
);

-- Enable RLS on test patients
ALTER TABLE public.test_patients ENABLE ROW LEVEL SECURITY;

-- RLS policies for test patients - only admins can access
CREATE POLICY "Admins can manage test patients"
  ON public.test_patients
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Function to validate AI confidence and determine next action
CREATE OR REPLACE FUNCTION public.validate_ai_confidence(
  conditions JSONB,
  confidence_threshold NUMERIC DEFAULT 0.70
)
RETURNS TABLE(
  passed_validation BOOLEAN,
  highest_confidence NUMERIC,
  average_confidence NUMERIC,
  recommended_action TEXT,
  validation_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  condition_record JSONB;
  confidence_sum NUMERIC := 0;
  confidence_count INTEGER := 0;
  max_confidence NUMERIC := 0;
  validation_passed BOOLEAN := false;
  action_recommendation TEXT;
  details JSONB := '{}';
BEGIN
  -- Process each condition and extract confidence scores
  FOR condition_record IN SELECT jsonb_array_elements(conditions) LOOP
    IF condition_record ? 'probability' THEN
      confidence_sum := confidence_sum + (condition_record->>'probability')::NUMERIC;
      confidence_count := confidence_count + 1;
      max_confidence := GREATEST(max_confidence, (condition_record->>'probability')::NUMERIC);
    END IF;
  END LOOP;
  
  -- Calculate averages and determine validation
  IF confidence_count > 0 THEN
    average_confidence := confidence_sum / confidence_count;
    highest_confidence := max_confidence;
    
    -- Determine if validation passes
    validation_passed := highest_confidence >= confidence_threshold;
    
    -- Recommend action based on confidence
    IF highest_confidence >= 0.85 THEN
      action_recommendation := 'proceed_with_ai_recommendation';
    ELSIF highest_confidence >= confidence_threshold THEN
      action_recommendation := 'proceed_with_doctor_review';
    ELSE
      action_recommendation := 'consult_doctor_directly';
    END IF;
    
    -- Build details
    details := jsonb_build_object(
      'total_conditions', confidence_count,
      'confidence_range', jsonb_build_object(
        'min', (SELECT MIN((c->>'probability')::NUMERIC) FROM jsonb_array_elements(conditions) c WHERE c ? 'probability'),
        'max', highest_confidence,
        'avg', average_confidence
      ),
      'threshold_used', confidence_threshold
    );
  ELSE
    -- No valid confidence scores found
    validation_passed := false;
    highest_confidence := 0;
    average_confidence := 0;
    action_recommendation := 'consult_doctor_directly';
    details := jsonb_build_object('error', 'no_confidence_scores_found');
  END IF;
  
  RETURN QUERY SELECT validation_passed, highest_confidence, average_confidence, action_recommendation, details;
END;
$$;

-- Function to log monitoring events
CREATE OR REPLACE FUNCTION public.log_monitoring_event(
  event_type_param TEXT,
  entity_id_param UUID,
  event_data_param JSONB,
  success_param BOOLEAN DEFAULT true,
  error_message_param TEXT DEFAULT NULL,
  latency_ms_param INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to check system health and trigger alerts
CREATE OR REPLACE FUNCTION public.check_system_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  error_rate NUMERIC;
  rejection_rate NUMERIC;
  avg_response_time NUMERIC;
  alert_data JSONB := '{}';
  alerts_triggered INTEGER := 0;
BEGIN
  -- Check error rate in the last hour
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE success = false) * 100.0 / COUNT(*))
    END INTO error_rate
  FROM public.monitoring_logs
  WHERE event_type = 'api_call' 
    AND created_at >= now() - INTERVAL '1 hour';
  
  -- Check doctor rejection rate for AI recommendations in the last 24 hours
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE override_type IN ('complete_rejection', 'partial_modification')) * 100.0 / COUNT(*))
    END INTO rejection_rate
  FROM public.doctor_overrides
  WHERE created_at >= now() - INTERVAL '24 hours';
  
  -- Check average response time in the last hour
  SELECT COALESCE(AVG(latency_ms), 0) INTO avg_response_time
  FROM public.monitoring_logs
  WHERE event_type = 'api_call' 
    AND latency_ms IS NOT NULL
    AND created_at >= now() - INTERVAL '1 hour';
  
  -- Trigger alert if error rate > 5%
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
  
  -- Trigger alert if rejection rate > 50%
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
  
  -- Trigger alert if response time > 5 seconds
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
  
  -- Return health summary
  alert_data := jsonb_build_object(
    'error_rate_percent', error_rate,
    'rejection_rate_percent', rejection_rate,
    'avg_response_time_ms', avg_response_time,
    'alerts_triggered', alerts_triggered,
    'checked_at', now()
  );
  
  RETURN alert_data;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_monitoring_logs_event_type_created ON public.monitoring_logs(event_type, created_at DESC);
CREATE INDEX idx_monitoring_logs_entity_id ON public.monitoring_logs(entity_id);
CREATE INDEX idx_ai_confidence_logs_session_id ON public.ai_confidence_logs(diagnosis_session_id);
CREATE INDEX idx_doctor_overrides_doctor_id ON public.doctor_overrides(doctor_id);
CREATE INDEX idx_performance_metrics_type_measured ON public.performance_metrics(metric_type, measured_at DESC);