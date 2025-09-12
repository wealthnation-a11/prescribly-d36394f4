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

    const { sessionId, userId, conditions } = await req.json();

    // Input validation
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!conditions || !Array.isArray(conditions)) {
      return new Response(
        JSON.stringify({ error: 'Conditions array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the session belongs to the authenticated user
    const { data: session, error: sessionError } = await supabase
      .from('diagnosis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('patient_id', user.id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Diagnosis session not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize conditions
    const sanitizedConditions = conditions
      .slice(0, 10) // Limit to 10 conditions max
      .map(condition => {
        if (typeof condition !== 'object' || !condition.name || typeof condition.probability !== 'number') {
          return null;
        }
        
        return {
          name: String(condition.name).trim().substring(0, 200),
          probability: Math.max(0, Math.min(1, parseFloat(condition.probability.toFixed(3)))),
          explanation: condition.explanation ? String(condition.explanation).trim().substring(0, 500) : undefined
        };
      })
      .filter(condition => condition !== null);

    if (sanitizedConditions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one valid condition is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving diagnosis for session:', sessionId, 'conditions:', sanitizedConditions);

    // Update the diagnosis session with conditions and set status to completed
    const { error: updateError } = await supabase
      .from('diagnosis_sessions')
      .update({
        ai_diagnoses: sanitizedConditions,
        doctor_review_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('patient_id', user.id);

    if (updateError) {
      console.error('Error updating diagnosis session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save diagnosis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log for diagnosis completion
    try {
      await supabase.functions.invoke('create-audit-log', {
        body: {
          diagnosis_id: sessionId,
          actor_id: user.id,
          action: 'diagnosis_completed',
          details: {
            conditions_count: sanitizedConditions.length,
            highest_probability: Math.max(...sanitizedConditions.map(c => c.probability)),
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Create notification for diagnosis completion
    try {
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: user.id,
          title: 'Diagnosis Completed',
          message: `Your diagnosis has been saved with ${sanitizedConditions.length} potential condition(s). A doctor will review your case shortly.`,
          type: 'diagnosis_saved',
          diagnosis_session_id: sessionId
        }
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the main operation
    }

    return new Response(
      JSON.stringify({
        message: 'Diagnosis saved successfully',
        sessionId: sessionId,
        conditionsCount: sanitizedConditions.length,
        status: 'completed',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-diagnosis function:', error);
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