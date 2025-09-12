import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Security: Authentication and Authorization
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

    // Check doctor role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'doctor') {
      await logSecurityEvent(supabase, 'unauthorized_access', user.id, req, 'high');
      return new Response(
        JSON.stringify({ error: 'Access denied. Doctor role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting for doctor actions
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      user_uuid: user.id,
      endpoint_name: 'doctor-actions',
      max_requests: 50,
      window_minutes: 60
    });

    if (!rateLimitCheck) {
      await logSecurityEvent(supabase, 'rate_limit_exceeded', user.id, req, 'medium');
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 2]; // approve, modify, or reject
    const sessionId = pathParts[pathParts.length - 1];

    // Input validation
    if (!['approve', 'modify', 'reject'].includes(action)) {
      await logSecurityEvent(supabase, 'invalid_action', user.id, req, 'medium');
      return new Response(
        JSON.stringify({ error: 'Invalid action specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      await logSecurityEvent(supabase, 'invalid_session_id', user.id, req, 'medium');
      return new Response(
        JSON.stringify({ error: 'Invalid session ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await req.json();

    // Validate and sanitize doctor notes
    let doctorNotes = '';
    if (requestData.doctorNotes) {
      doctorNotes = String(requestData.doctorNotes).trim().substring(0, 5000);
      // Remove potentially harmful content
      doctorNotes = doctorNotes.replace(/[<>]/g, '');
    }

    // Validate prescription data for approve/modify actions
    let prescriptionData = null;
    if ((action === 'approve' || action === 'modify') && requestData.prescriptionData) {
      prescriptionData = validatePrescriptionData(requestData.prescriptionData);
      if (!prescriptionData) {
        await logSecurityEvent(supabase, 'invalid_prescription_data', user.id, req, 'high');
        return new Response(
          JSON.stringify({ error: 'Invalid prescription data provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch and validate diagnosis session
    const { data: session, error: sessionError } = await supabase
      .from('diagnosis_sessions_v2')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'pending')
      .single();

    if (sessionError || !session) {
      await logSecurityEvent(supabase, 'session_not_found', user.id, req, 'medium');
      return new Response(
        JSON.stringify({ error: 'Diagnosis session not found or not available for review' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for emergency flags that would prevent prescription
    if (action === 'approve' || action === 'modify') {
      const { data: emergencyFlags } = await supabase
        .from('emergency_flags')
        .select('*')
        .eq('diagnosis_session_id', sessionId)
        .eq('severity_level', 5);

      if (emergencyFlags && emergencyFlags.length > 0) {
        await logSecurityEvent(supabase, 'emergency_prescription_blocked', user.id, req, 'critical');
        return new Response(
          JSON.stringify({ 
            error: 'Cannot prescribe medication for emergency cases. Patient must seek immediate medical attention.',
            emergencyFlags: emergencyFlags.map(f => f.description)
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update diagnosis session
    const updateData: any = {
      status: action === 'approve' ? 'approved' : action === 'modify' ? 'modified' : 'rejected',
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('diagnosis_sessions_v2')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating diagnosis session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update diagnosis session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let prescriptionId = null;

    // Create prescription for approve/modify actions
    if ((action === 'approve' || action === 'modify') && prescriptionData) {
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions_v2')
        .insert({
          diagnosis_id: sessionId,
          doctor_id: user.id,
          patient_id: session.user_id,
          drugs: prescriptionData,
          status: 'approved'
        })
        .select()
        .single();

      if (prescriptionError) {
        console.error('Error creating prescription:', prescriptionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create prescription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      prescriptionId = prescription.id;
    }

    // Create audit log
    try {
      await supabase.functions.invoke('create-audit-log', {
        body: {
          diagnosis_id: sessionId,
          actor_id: user.id,
          action: `doctor_${action}`,
          details: {
            doctor_notes: doctorNotes,
            prescription_created: !!prescriptionId,
            prescription_id: prescriptionId,
            action_timestamp: new Date().toISOString()
          }
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Create notification for patient
    try {
      const notificationMessage = getNotificationMessage(action, session.conditions, doctorNotes);
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: session.user_id,
          title: `Diagnosis ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
          message: notificationMessage,
          type: 'diagnosis_update',
          diagnosis_session_id: sessionId
        }
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the main operation
    }

    // Log successful doctor action
    await logSecurityEvent(supabase, `doctor_action_${action}`, user.id, req, 'low');

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        sessionId: sessionId,
        prescriptionId: prescriptionId,
        message: `Diagnosis session ${action}d successfully`,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in secure-doctor-actions:', error);
    
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

function validatePrescriptionData(data: any): any[] | null {
  if (!Array.isArray(data)) return null;
  
  const validatedDrugs = [];
  
  for (const drug of data) {
    if (typeof drug !== 'object' || !drug.name || !drug.dosage) {
      return null; // Invalid drug format
    }
    
    const validatedDrug = {
      name: String(drug.name).trim().substring(0, 200),
      dosage: String(drug.dosage).trim().substring(0, 100),
      frequency: String(drug.frequency || '').trim().substring(0, 100),
      duration: String(drug.duration || '').trim().substring(0, 50),
      instructions: String(drug.instructions || '').trim().substring(0, 500),
      warnings: String(drug.warnings || '').trim().substring(0, 500)
    };
    
    // Remove empty fields
    Object.keys(validatedDrug).forEach(key => {
      if (!validatedDrug[key]) delete validatedDrug[key];
    });
    
    validatedDrugs.push(validatedDrug);
  }
  
  return validatedDrugs.length > 0 ? validatedDrugs : null;
}

function getNotificationMessage(action: string, conditions: any[], notes: string): string {
  const conditionNames = conditions?.map(c => c.name).join(', ') || 'your symptoms';
  
  switch (action) {
    case 'approve':
      return `Your diagnosis for ${conditionNames} has been approved by a doctor. ${notes ? 'Doctor notes: ' + notes : ''}`;
    case 'modify':
      return `Your diagnosis for ${conditionNames} has been modified by a doctor. ${notes ? 'Doctor notes: ' + notes : ''}`;
    case 'reject':
      return `Your diagnosis submission has been reviewed. Please consult with a healthcare provider for further evaluation. ${notes ? 'Doctor notes: ' + notes : ''}`;
    default:
      return `Your diagnosis has been reviewed by a doctor.`;
  }
}

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
        endpoint: 'secure-doctor-actions',
        request_method: req.method,
        risk_level: riskLevel,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}