import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const diagnosisRequestSchema = z.object({
  symptoms: z.array(z.string().max(500)).min(1).max(20),
  severity: z.number().int().min(1).max(10).optional(),
  duration: z.string().max(200).optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.string().max(20).optional(),
  medicalHistory: z.string().max(5000).optional(),
});

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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Security: Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logSecurityEvent(supabase, 'auth_missing', null, req, 'high');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      await logSecurityEvent(supabase, 'auth_invalid', null, req, 'high');
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Rate limiting check
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      user_uuid: user.id,
      endpoint_name: 'diagnose-symptoms',
      max_requests: 10,
      window_minutes: 60
    });

    if (!rateLimitCheck) {
      await logSecurityEvent(supabase, 'rate_limit_exceeded', user.id, req, 'medium');
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.json();
    const bodyValidation = diagnosisRequestSchema.safeParse(rawBody);
    if (!bodyValidation.success) {
      await logSecurityEvent(supabase, 'invalid_input', user.id, req, 'medium');
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: bodyValidation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const requestData = bodyValidation.data;

    // Sanitize inputs
    const sanitizedSymptoms = requestData.symptoms
      .slice(0, 20) // Limit number of symptoms
      .map(symptom => {
        if (typeof symptom !== 'string') return '';
        return symptom.trim().substring(0, 500); // Limit length
      })
      .filter(symptom => symptom.length > 0);

    if (sanitizedSymptoms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid symptoms provided after sanitization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Emergency detection
    const { data: emergencyCheck } = await supabase.rpc('check_emergency_symptoms', {
      symptoms: sanitizedSymptoms
    });

    const isEmergency = emergencyCheck?.[0]?.is_emergency || false;
    const emergencyFlags = emergencyCheck?.[0]?.flags || [];
    const severityLevel = emergencyCheck?.[0]?.severity || 1;

    if (isEmergency) {
      await logSecurityEvent(supabase, 'emergency_detected', user.id, req, 'critical');
      
      return new Response(
        JSON.stringify({
          emergency: true,
          message: "🚨 EMERGENCY SYMPTOMS DETECTED",
          warning: "Please seek immediate medical attention. Do not wait for online diagnosis.",
          emergencyNumbers: ["911", "Emergency Services"],
          flags: emergencyFlags,
          severity: severityLevel
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // AI Diagnosis (using OpenAI)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `
You are a medical AI assistant. Based on the following symptoms, provide a differential diagnosis with confidence scores.

Symptoms: ${sanitizedSymptoms.join(', ')}
${requestData.age ? `Age: ${requestData.age}` : ''}
${requestData.gender ? `Gender: ${requestData.gender}` : ''}
${requestData.severity ? `Severity (1-10): ${requestData.severity}` : ''}
${requestData.duration ? `Duration: ${requestData.duration}` : ''}
${requestData.medicalHistory ? `Medical History: ${requestData.medicalHistory}` : ''}

Provide response in JSON format:
{
  "conditions": [
    {
      "name": "Condition Name",
      "probability": 0.85,
      "description": "Brief description",
      "severity": "mild|moderate|severe",
      "urgency": "low|medium|high",
      "recommendations": ["recommendation1", "recommendation2"]
    }
  ],
  "redFlags": ["any emergency symptoms to watch for"],
  "generalAdvice": "General advice for the patient"
}

Important: If ANY symptoms suggest emergency conditions, include high urgency recommendations.
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant trained to provide differential diagnosis based on symptoms. Always prioritize patient safety.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return new Response(
        JSON.stringify({ error: 'AI diagnosis service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await openaiResponse.json();
    let aiDiagnosis;
    
    try {
      aiDiagnosis = JSON.parse(aiResult.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      aiDiagnosis = {
        conditions: [{
          name: "Unable to provide diagnosis",
          probability: 0,
          description: "AI diagnosis service encountered an error",
          severity: "unknown",
          urgency: "medium",
          recommendations: ["Please consult a healthcare professional"]
        }],
        redFlags: [],
        generalAdvice: "Please seek medical advice from a qualified healthcare provider"
      };
    }

    // Save diagnosis session
    const { data: sessionData, error: sessionError } = await supabase
      .from('diagnosis_sessions_v2')
      .insert({
        user_id: user.id,
        symptoms: sanitizedSymptoms,
        conditions: aiDiagnosis.conditions || [],
        status: 'pending'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error saving diagnosis session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to save diagnosis session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log
    try {
      await supabase.functions.invoke('create-audit-log', {
        body: {
          diagnosis_id: sessionData.id,
          actor_id: user.id,
          action: 'ai_diagnosis_generated',
          details: {
            symptoms_count: sanitizedSymptoms.length,
            conditions_count: aiDiagnosis.conditions?.length || 0,
            ai_model: 'gpt-4',
            confidence_scores: aiDiagnosis.conditions?.map(c => c.probability) || []
          }
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Log successful diagnosis
    await logSecurityEvent(supabase, 'diagnosis_generated', user.id, req, 'low');

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: sessionData.id,
        diagnosis: aiDiagnosis,
        emergency: false,
        metadata: {
          symptomsAnalyzed: sanitizedSymptoms.length,
          conditionsFound: aiDiagnosis.conditions?.length || 0,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in diagnose-symptoms-secure:', error);
    
    // Log security event for unexpected errors
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await logSecurityEvent(supabase, 'server_error', null, req, 'high');
    } catch (logError) {
      console.error('Failed to log security event:', logError);
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

async function logSecurityEvent(
  supabase: any,
  eventType: string,
  userId: string | null,
  req: Request,
  riskLevel: string
) {
  try {
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwarded || realIp || 'unknown';

    await supabase
      .from('security_audit')
      .insert({
        event_type: eventType,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        endpoint: 'diagnose-symptoms-secure',
        request_method: req.method,
        risk_level: riskLevel,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}