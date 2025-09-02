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

    const { session_id, user_id, path, payload } = await req.json();

    if (!session_id) {
      // Create new session
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({ 
          user_id, 
          path: path || 'entry', 
          payload: payload || {} 
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, session_id: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update existing session
      const { error } = await supabase
        .from('user_sessions')
        .upsert({ 
          id: session_id, 
          user_id, 
          path: path || 'entry', 
          payload: payload || {},
          updated_at: new Date().toISOString() 
        });

      if (error) {
        console.error('Error updating session:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update session' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, session_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in save-session:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});