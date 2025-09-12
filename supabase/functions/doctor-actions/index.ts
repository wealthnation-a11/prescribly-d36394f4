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

    // Update diagnosis session
    const { error: updateError } = await supabase
      .from('diagnosis_sessions')
      .update(updateData)
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

    // Create prescription if approved or modified
    if (prescriptionData && (action === 'approve' || action === 'modify')) {
      // Get patient ID from session
      const { data: session } = await supabase
        .from('diagnosis_sessions')
        .select('patient_id')
        .eq('id', sessionId)
        .single();

      if (session) {
        prescriptionData.patient_id = session.patient_id;
        
        const { error: prescriptionError } = await supabase
          .from('prescriptions')
          .insert(prescriptionData);

        if (prescriptionError) {
          console.error('Error creating prescription:', prescriptionError);
          // Continue anyway, session was updated
        }
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