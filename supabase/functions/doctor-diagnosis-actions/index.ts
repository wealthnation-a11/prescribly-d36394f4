import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const drugSchema = z.object({
  name: z.string().min(1, "Drug name required").max(200, "Drug name too long"),
  dosage: z.string().min(1, "Dosage required").max(100, "Dosage too long"),
  frequency: z.string().max(100).optional(),
  duration: z.string().max(50).optional(),
  instructions: z.string().max(500).optional()
});

const doctorActionRequestSchema = z.object({
  drugs: z.array(drugSchema).min(1, "At least one drug required").max(10, "Too many drugs").optional(),
  doctorNotes: z.string().max(2000, "Doctor notes too long").optional(),
  reason: z.string().max(1000, "Reason too long").optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
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
      return new Response(
        JSON.stringify({ error: 'Access denied. Doctor role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL to get action and sessionId
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];
    const sessionId = pathParts[pathParts.length - 2];

    // Validate action
    if (!['approve', 'modify', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be approve, modify, or reject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session ID format
    const sessionIdSchema = z.string().uuid();
    const sessionValidation = sessionIdSchema.safeParse(sessionId);
    if (!sessionValidation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid session ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();

    // Validate request body
    const validation = doctorActionRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = validation.data;

    // Validate diagnosis session exists and is pending
    const { data: session, error: sessionError } = await supabase
      .from('diagnosis_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Diagnosis session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.doctor_review_status !== 'pending' && session.doctor_review_status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Diagnosis session is not available for doctor review' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let prescriptionId = null;
    let doctorNotes = requestData.doctorNotes || '';
    
    // Sanitize doctor notes
    if (doctorNotes) {
      doctorNotes = String(doctorNotes).trim().substring(0, 2000);
    }

    // Handle different actions
    if (action === 'approve' || action === 'modify') {
      // Validate prescription data
      const { drugs } = requestData;
      if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Prescription drugs are required for approve/modify actions' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sanitize drug data
      const sanitizedDrugs = drugs.slice(0, 10).map(drug => ({
        name: String(drug.name || '').trim().substring(0, 200),
        dosage: String(drug.dosage || '').trim().substring(0, 100),
        frequency: String(drug.frequency || '').trim().substring(0, 100),
        duration: String(drug.duration || '').trim().substring(0, 50),
        instructions: String(drug.instructions || '').trim().substring(0, 500)
      })).filter(drug => drug.name && drug.dosage);

      if (sanitizedDrugs.length === 0) {
        return new Response(
          JSON.stringify({ error: 'At least one valid drug prescription is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create prescription
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          doctor_id: user.id,
          patient_id: session.patient_id,
          medications: sanitizedDrugs,
          diagnosis: session.ai_diagnoses?.[0]?.name || 'Unspecified condition',
          instructions: doctorNotes,
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

    // Update diagnosis session with doctor action
    const updateData: any = {
      doctor_id: user.id,
      doctor_notes: doctorNotes,
      doctor_review_status: action === 'reject' ? 'rejected' : 'approved',
      updated_at: new Date().toISOString()
    };

    if (prescriptionId) {
      updateData.final_prescription_id = prescriptionId;
    }

    const { error: updateError } = await supabase
      .from('diagnosis_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating diagnosis session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update diagnosis session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
            action_reason: requestData.reason || null,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Create notification for patient
    try {
      const notificationMessage = getNotificationMessage(action, session.ai_diagnoses, doctorNotes);
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: session.patient_id,
          title: `Diagnosis ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
          message: notificationMessage,
          type: 'doctor_action',
          diagnosis_session_id: sessionId
        }
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the main operation
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        sessionId: sessionId,
        prescriptionId: prescriptionId,
        message: `Diagnosis ${action}d successfully`,
        doctorId: user.id,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in doctor-diagnosis-actions:', error);
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

function getNotificationMessage(action: string, diagnoses: any[], notes: string): string {
  const conditionNames = diagnoses?.map(d => d.name).join(', ') || 'your condition';
  
  switch (action) {
    case 'approve':
      return `Your diagnosis for ${conditionNames} has been approved by a doctor and prescription has been issued. ${notes ? 'Doctor notes: ' + notes : ''}`;
    case 'modify':
      return `Your diagnosis for ${conditionNames} has been reviewed and modified by a doctor. Updated prescription has been issued. ${notes ? 'Doctor notes: ' + notes : ''}`;
    case 'reject':
      return `Your diagnosis submission requires further evaluation. Please consult with a healthcare provider directly. ${notes ? 'Doctor notes: ' + notes : ''}`;
    default:
      return `Your diagnosis has been reviewed by a doctor.`;
  }
}