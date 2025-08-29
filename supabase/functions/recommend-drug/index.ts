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

    const { condition_id } = await req.json();
    
    if (!condition_id) {
      return new Response(
        JSON.stringify(null),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting drug recommendation for condition:', condition_id);

    // Get first safe drug recommendation for the condition
    const { data: drugs, error: drugsError } = await supabase
      .from('drug_recommendations')
      .select('drug_name, dosage, notes')
      .eq('condition_id', condition_id)
      .limit(1);

    if (drugsError) {
      console.error('Error fetching drug recommendations:', drugsError);
      return new Response(
        JSON.stringify(null),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recommendation = drugs && drugs.length > 0 ? drugs[0] : null;
    
    console.log('Drug recommendation:', recommendation);

    return new Response(
      JSON.stringify(recommendation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recommend-drug:', error);
    return new Response(
      JSON.stringify(null),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});