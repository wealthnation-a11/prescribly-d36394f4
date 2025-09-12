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

    const { sessionId, diagnosis, symptoms } = await req.json();

    // Input validation
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!diagnosis) {
      return new Response(
        JSON.stringify({ error: 'Diagnosis data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving diagnosis for session:', sessionId);

    // Create or update diagnosis session in diagnosis_sessions_v2 table
    const { data: existingSession, error: fetchError } = await supabase
      .from('diagnosis_sessions_v2')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    let saveError;
    if (existingSession) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('diagnosis_sessions_v2')
        .update({
          symptoms: symptoms || [],
          conditions: diagnosis?.diagnosis || diagnosis || [],
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);
      saveError = updateError;
    } else {
      // Create new session
      const { error: insertError } = await supabase
        .from('diagnosis_sessions_v2')
        .insert({
          id: sessionId,
          user_id: user.id,
          symptoms: symptoms || [],
          conditions: diagnosis?.diagnosis || diagnosis || [],
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      saveError = insertError;
    }

    if (saveError) {
      console.error('Error saving diagnosis session:', saveError);
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
          action: 'diagnosis_saved',
          details: {
            symptoms_count: symptoms?.length || 0,
            conditions_count: (diagnosis?.diagnosis || diagnosis || []).length,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Create notification for diagnosis save
    try {
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: user.id,
          title: 'Diagnosis Saved',
          message: `Your diagnosis has been saved successfully. You can review it in your dashboard.`,
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
        symptomsCount: symptoms?.length || 0,
        conditionsCount: (diagnosis?.diagnosis || diagnosis || []).length,
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