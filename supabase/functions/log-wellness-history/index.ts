import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  user_id: z.string().uuid(),
  input_text: z.string().max(10000).optional().nullable(),
  matched_conditions: z.unknown().optional().nullable(),
  top_condition: z.object({
    condition_id: z.union([z.string(), z.number()]).optional().nullable(),
  }).passthrough().optional().nullable(),
  drug_recommendation: z.unknown().optional().nullable(),
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

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, input_text, matched_conditions, top_condition } = validation.data;
    console.log('Logging wellness history for user:', user_id);

    const { data, error } = await supabase
      .from('user_history')
      .insert({
        user_id, input_text,
        parsed_symptoms: matched_conditions,
        suggested_conditions: top_condition ? [top_condition] : [],
        confirmed_condition: top_condition?.condition_id || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting history:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('History saved successfully:', data.id);
    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-wellness-history:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
