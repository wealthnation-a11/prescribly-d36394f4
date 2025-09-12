import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosisRequest {
  symptoms: string[];
  severity?: number;
  duration?: string;
  age?: number;
  gender?: string;
  medicalHistory?: string;
  confidenceThreshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let supabase: any;
  let user: any;
  let logId: string | null = null;

  try {
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logMonitoringEvent(supabase, 'api_call', null, {
        endpoint: 'diagnose-with-validation',
        error: 'missing_auth'
      }, false, 'Missing authentication header');
      
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authUser) {
      await logMonitoringEvent(supabase, 'api_call', null, {
        endpoint: 'diagnose-with-validation',
        error: 'invalid_auth'
      }, false, 'Invalid authentication');
      
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    user = authUser;

    // Rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      user_uuid: user.id,
      endpoint_name: 'diagnose-with-validation',
      max_requests: 5,
      window_minutes: 60
    });

    if (!rateLimitCheck) {
      await logMonitoringEvent(supabase, 'api_call', user.id, {
        endpoint: 'diagnose-with-validation',
        error: 'rate_limit_exceeded'
      }, false, 'Rate limit exceeded');
      
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: DiagnosisRequest = await req.json();

    // Input validation
    const validationErrors = validateDiagnosisInput(requestData);
    if (validationErrors.length > 0) {
      await logMonitoringEvent(supabase, 'api_call', user.id, {
        endpoint: 'diagnose-with-validation',
        error: 'validation_failed',
        validation_errors: validationErrors
      }, false, 'Input validation failed');
      
      return new Response(
        JSON.stringify({ 
          error: 'Input validation failed',
          details: validationErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedSymptoms = requestData.symptoms
      .slice(0, 10)
      .map(symptom => symptom.trim().substring(0, 300))
      .filter(symptom => symptom.length > 0);

    // Emergency detection
    const { data: emergencyCheck } = await supabase.rpc('check_emergency_symptoms', {
      symptoms: sanitizedSymptoms
    });

    const isEmergency = emergencyCheck?.[0]?.is_emergency || false;
    
    if (isEmergency) {
      const emergencyFlags = emergencyCheck[0].flags || [];
      const severityLevel = emergencyCheck[0].severity || 5;
      
      await logMonitoringEvent(supabase, 'api_call', user.id, {
        endpoint: 'diagnose-with-validation',
        emergency_detected: true,
        flags: emergencyFlags,
        severity: severityLevel
      }, true, null, Date.now() - startTime);
      
      return new Response(
        JSON.stringify({
          emergency: true,
          message: "🚨 EMERGENCY SYMPTOMS DETECTED",
          warning: "Please seek immediate medical attention. Do not wait for online diagnosis.",
          flags: emergencyFlags,
          severity: severityLevel,
          action: "seek_emergency_care"
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // AI Diagnosis using OpenAI
    const aiStartTime = Date.now();
    const diagnosisResponse = await generateAIDiagnosis(sanitizedSymptoms, requestData);
    const aiLatency = Date.now() - aiStartTime;

    if (!diagnosisResponse.success) {
      await logMonitoringEvent(supabase, 'ai_response', user.id, {
        endpoint: 'diagnose-with-validation',
        ai_error: diagnosisResponse.error,
        ai_latency_ms: aiLatency
      }, false, 'AI diagnosis failed');
      
      return new Response(
        JSON.stringify({ 
          error: 'AI diagnosis service temporarily unavailable',
          details: diagnosisResponse.error
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conditions = diagnosisResponse.diagnosis.conditions || [];

    // Validate AI confidence
    const confidenceThreshold = requestData.confidenceThreshold || 0.70;
    const { data: validationResult } = await supabase.rpc('validate_ai_confidence', {
      conditions: conditions,
      confidence_threshold: confidenceThreshold
    });

    const validationData = validationResult[0];
    const passedValidation = validationData.passed_validation;
    const recommendedAction = validationData.recommended_action;

    // Create diagnosis session
    const { data: sessionData, error: sessionError } = await supabase
      .from('diagnosis_sessions_v2')
      .insert({
        user_id: user.id,
        symptoms: sanitizedSymptoms,
        conditions: conditions,
        status: passedValidation ? 'pending' : 'low_confidence'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating diagnosis session:', sessionError);
      await logMonitoringEvent(supabase, 'api_call', user.id, {
        endpoint: 'diagnose-with-validation',
        error: 'session_creation_failed'
      }, false, sessionError.message);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create diagnosis session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log AI confidence
    await supabase
      .from('ai_confidence_logs')
      .insert({
        diagnosis_session_id: sessionData.id,
        ai_model: 'gpt-5-2025-08-07',
        conditions_analyzed: conditions,
        highest_confidence: validationData.highest_confidence,
        average_confidence: validationData.average_confidence,
        confidence_threshold: confidenceThreshold,
        passed_threshold: passedValidation,
        override_reason: !passedValidation ? 'Below confidence threshold' : null
      });

    // Log successful API call with performance metrics
    const totalLatency = Date.now() - startTime;
    logId = await logMonitoringEvent(supabase, 'api_call', user.id, {
      endpoint: 'diagnose-with-validation',
      session_id: sessionData.id,
      symptoms_count: sanitizedSymptoms.length,
      conditions_found: conditions.length,
      confidence_validation: {
        passed: passedValidation,
        highest: validation.highest_confidence,
        average: validation.average_confidence,
        threshold: confidenceThreshold,
        action: recommendedAction
      },
      ai_latency_ms: aiLatency
    }, true, null, totalLatency);

    // Log performance metric
    await supabase
      .from('performance_metrics')
      .insert({
        metric_type: 'api_response_time',
        endpoint: 'diagnose-with-validation',
        value: totalLatency,
        unit: 'milliseconds',
        metadata: {
          ai_latency_ms: aiLatency,
          symptoms_count: sanitizedSymptoms.length,
          conditions_count: conditions.length
        }
      });

    // Create audit log
    try {
      await supabase.functions.invoke('create-audit-log', {
        body: {
          diagnosis_id: sessionData.id,
          actor_id: user.id,
          action: 'ai_diagnosis_with_validation',
          details: {
            confidence_validation: validationData,
            ai_model: 'gpt-5-2025-08-07',
            performance: {
              total_latency_ms: totalLatency,
              ai_latency_ms: aiLatency
            }
          }
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: sessionData.id,
        diagnosis: diagnosisResponse.diagnosis,
        validation: {
          passed: passedValidation,
          confidence: {
            highest: validationData.highest_confidence,
            average: validationData.average_confidence,
            threshold: confidenceThreshold
          },
          recommendedAction: recommendedAction,
          details: validationData.validation_details
        },
        performance: {
          totalLatency: totalLatency,
          aiLatency: aiLatency
        },
        emergency: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in diagnose-with-validation:', error);
    
    const totalLatency = Date.now() - startTime;
    try {
      await logMonitoringEvent(supabase, 'api_call', user?.id || null, {
        endpoint: 'diagnose-with-validation',
        error: 'server_error',
        error_message: error.message
      }, false, error.message, totalLatency);
    } catch (logError) {
      console.error('Failed to log error event:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function validateDiagnosisInput(data: DiagnosisRequest): string[] {
  const errors: string[] = [];
  
  if (!data.symptoms || !Array.isArray(data.symptoms)) {
    errors.push('Symptoms must be an array');
  } else if (data.symptoms.length === 0) {
    errors.push('At least one symptom is required');
  } else if (data.symptoms.length > 10) {
    errors.push('Maximum 10 symptoms allowed');
  }
  
  if (data.symptoms) {
    for (let i = 0; i < data.symptoms.length; i++) {
      if (typeof data.symptoms[i] !== 'string') {
        errors.push(`Symptom ${i + 1} must be a string`);
      } else if (data.symptoms[i].trim().length === 0) {
        errors.push(`Symptom ${i + 1} cannot be empty`);
      } else if (data.symptoms[i].length > 300) {
        errors.push(`Symptom ${i + 1} cannot exceed 300 characters`);
      }
    }
  }
  
  if (data.severity !== undefined && (typeof data.severity !== 'number' || data.severity < 1 || data.severity > 10)) {
    errors.push('Severity must be a number between 1 and 10');
  }
  
  if (data.age !== undefined && (typeof data.age !== 'number' || data.age < 0 || data.age > 150)) {
    errors.push('Age must be a valid number between 0 and 150');
  }
  
  if (data.confidenceThreshold !== undefined && (typeof data.confidenceThreshold !== 'number' || data.confidenceThreshold < 0 || data.confidenceThreshold > 1)) {
    errors.push('Confidence threshold must be a number between 0 and 1');
  }
  
  return errors;
}

async function generateAIDiagnosis(symptoms: string[], requestData: DiagnosisRequest) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  const prompt = `
You are a medical AI assistant. Analyze the following symptoms and provide a differential diagnosis.

Symptoms: ${symptoms.join(', ')}
${requestData.age ? `Age: ${requestData.age}` : ''}
${requestData.gender ? `Gender: ${requestData.gender}` : ''}
${requestData.severity ? `Severity (1-10): ${requestData.severity}` : ''}
${requestData.duration ? `Duration: ${requestData.duration}` : ''}
${requestData.medicalHistory ? `Medical History: ${requestData.medicalHistory}` : ''}

Provide a JSON response with the following structure:
{
  "conditions": [
    {
      "name": "Condition Name",
      "probability": 0.85,
      "description": "Brief clinical description",
      "severity": "mild|moderate|severe",
      "urgency": "low|medium|high",
      "icd10": "ICD-10 code if applicable",
      "recommendations": ["recommendation1", "recommendation2"]
    }
  ],
  "redFlags": ["emergency symptoms to watch for"],
  "generalAdvice": "General medical advice",
  "disclaimers": ["This is not a substitute for professional medical advice"]
}

IMPORTANT: Assign realistic probability scores based on symptom correlation. Emergency conditions should have high urgency.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI trained to provide differential diagnosis. Always prioritize patient safety and provide realistic confidence scores.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const result = await response.json();
    
    try {
      const diagnosis = JSON.parse(result.choices[0].message.content);
      return { success: true, diagnosis };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return { success: false, error: 'Invalid AI response format' };
    }

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return { success: false, error: error.message };
  }
}

async function logMonitoringEvent(
  supabase: any,
  eventType: string,
  entityId: string | null,
  eventData: any,
  success: boolean = true,
  errorMessage: string | null = null,
  latencyMs: number | null = null
): Promise<string | null> {
  try {
    const { data } = await supabase.rpc('log_monitoring_event', {
      event_type_param: eventType,
      entity_id_param: entityId,
      event_data_param: eventData,
      success_param: success,
      error_message_param: errorMessage,
      latency_ms_param: latencyMs
    });
    return data;
  } catch (error) {
    console.error('Failed to log monitoring event:', error);
    return null;
  }
}