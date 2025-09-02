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

    const { session_id } = await req.json();
    
    if (!session_id) {
      return new Response(
        JSON.stringify({ found: false, message: 'Session ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: session, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (error || !session) {
      return new Response(
        JSON.stringify({ found: false, message: 'Session not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session is recent (within 24 hours)
    const sessionAge = Date.now() - new Date(session.updated_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      return new Response(
        JSON.stringify({ found: false, message: 'Session expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        found: true, 
        session: {
          id: session.id,
          path: session.path,
          payload: session.payload,
          status: session.status,
          updated_at: session.updated_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in resume-session:', error);
    return new Response(
      JSON.stringify({ found: false, error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});