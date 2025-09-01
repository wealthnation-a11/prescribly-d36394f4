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

    console.log('Getting prescription for condition:', condition_id);

    // Get drug recommendations from conditions table
    const { data: condition, error } = await supabase
      .from('conditions')
      .select('drug_recommendations, drug_usage')
      .eq('id', condition_id)
      .single();

    if (error) {
      console.error('Error fetching condition:', error);
      return new Response(
        JSON.stringify(null),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract first drug recommendation
    let prescription = null;
    
    if (condition?.drug_recommendations && condition.drug_recommendations.length > 0) {
      const firstDrug = condition.drug_recommendations[0];
      const drugUsage = condition?.drug_usage?.find((usage: any) => 
        usage.drug === firstDrug.drug
      );

      prescription = {
        drug_name: firstDrug.drug,
        dosage: drugUsage?.usage || 'As directed by physician',
        notes: 'Always consult with a healthcare provider before taking any medication.'
      };
    }
    
    console.log('Prescription recommendation:', prescription);

    return new Response(
      JSON.stringify(prescription),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in prescribe:', error);
    return new Response(
      JSON.stringify(null),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});