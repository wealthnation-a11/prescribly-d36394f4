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

    const { 
      user_id, 
      input_text, 
      parsed_symptoms, 
      suggested_conditions, 
      confirmed_condition 
    } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Logging history for user:', user_id);

    // Insert into user_history
    const { data, error } = await supabase
      .from('user_history')
      .insert({
        user_id,
        input_text,
        parsed_symptoms,
        suggested_conditions,
        confirmed_condition
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging history:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save history' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('History logged successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-history:', error);
    return new Response(
      JSON.stringify({ error: 'Processing failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});