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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a doctor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'doctor') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Doctor access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 2]; // Get session ID from URL
    const action = pathParts[pathParts.length - 1]; // Get action from URL

    const { medications, diagnosis, instructions, notes, reason } = await req.json();

    console.log(`Doctor ${user.id} performing ${action} on session ${sessionId}`);

    let updateData: any = {
      doctor_id: user.id,
      doctor_notes: notes || '',
      updated_at: new Date().toISOString()
    };

    let prescriptionData: any = null;

    switch (action) {
      case 'approve':
        updateData.doctor_review_status = 'approved';
        
        // Create prescription record
        prescriptionData = {
          doctor_id: user.id,
          medications: medications || [],
          diagnosis: diagnosis || '',
          instructions: instructions || '',
          status: 'active'
        };
        break;

      case 'modify':
        updateData.doctor_review_status = 'modified';
        updateData.suggested_drugs = medications || [];
        
        // Create modified prescription
        prescriptionData = {
          doctor_id: user.id,
          medications: medications || [],
          diagnosis: diagnosis || '',
          instructions: instructions || '',
          status: 'active'
        };
        break;

      case 'reject':
        updateData.doctor_review_status = 'rejected';
        updateData.doctor_notes = reason || notes || 'Rejected by doctor';
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update diagnosis session in v2 table
    const { error: updateError } = await supabase
      .from('diagnosis_sessions_v2')
      .update({
        status: action === 'approve' ? 'approved' : action === 'modify' ? 'modified' : 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating diagnosis session:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: updateError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get session details for notifications and audit
    const { data: session } = await supabase
      .from('diagnosis_sessions_v2')
      .select('user_id, symptoms, conditions')
      .eq('id', sessionId)
      .single();

    // Create prescription if approved or modified
    if (prescriptionData && (action === 'approve' || action === 'modify')) {
      if (session) {
        prescriptionData.patient_id = session.user_id;
        prescriptionData.diagnosis_id = sessionId;
        
        const { error: prescriptionError } = await supabase
          .from('prescriptions_v2')
          .insert(prescriptionData);

        if (prescriptionError) {
          console.error('Error creating prescription:', prescriptionError);
          // Continue anyway, session was updated
        }
      }
    }

    // Create audit log
    try {
      await supabase.functions.invoke('create-audit-log', {
        body: {
          diagnosis_id: sessionId,
          actor_id: user.id,
          action: `diagnosis_${action}`,
          details: {
            action,
            medications: medications || [],
            diagnosis: diagnosis || '',
            instructions: instructions || '',
            notes: notes || '',
            reason: reason || ''
          }
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Create notification for patient
    if (session) {
      try {
        const notificationData = {
          user_id: session.user_id,
          type: 'diagnosis_update',
          title: `Diagnosis ${action === 'approve' ? 'Approved' : action === 'modify' ? 'Modified' : 'Rejected'}`,
          message: getNotificationMessage(action, diagnosis || '', notes || ''),
          data: {
            diagnosis_session_id: sessionId,
            action,
            doctor_id: user.id
          },
          diagnosis_session_id: sessionId
        };

        await supabase.functions.invoke('create-notification', {
          body: notificationData
        });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the main operation
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        session_id: sessionId,
        message: `Diagnosis session ${action}d successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in doctor-actions:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to generate notification messages
function getNotificationMessage(action: string, diagnosis: string, notes: string): string {
  switch (action) {
    case 'approve':
      return `Your diagnosis has been approved by a doctor. ${diagnosis ? `Diagnosis: ${diagnosis}` : ''} ${notes ? `Notes: ${notes}` : ''}`.trim();
    case 'modify':
      return `Your diagnosis has been reviewed and modified by a doctor. ${diagnosis ? `Updated diagnosis: ${diagnosis}` : ''} ${notes ? `Notes: ${notes}` : ''}`.trim();
    case 'reject':
      return `Your diagnosis submission has been reviewed. ${notes ? `Doctor's notes: ${notes}` : 'Please consult with a healthcare provider for further evaluation.'}`;
    default:
      return 'Your diagnosis has been reviewed by a doctor.';
  }
}