import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosisResult {
  condition_id: number;
  name: string;
  description: string;
  probability: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { matchedConditions, age, gender } = await req.json();
    
    if (!matchedConditions || matchedConditions.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Diagnosing conditions:', matchedConditions);

    // Get condition details
    const conditionIds = matchedConditions.map((c: any) => c.id);
    const { data: conditions, error } = await supabase
      .from('conditions')
      .select('id, name, description, prevalence, category')
      .in('id', conditionIds);

    if (error) {
      console.error('Error fetching conditions:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Apply Bayesian-like scoring
    const diagnoses: DiagnosisResult[] = conditions.map((condition: any) => {
      const match = matchedConditions.find((m: any) => m.id === condition.id);
      const baseConfidence = match?.confidence || 0;
      
      // Adjust for prevalence
      const prevalenceBoost = (condition.prevalence || 0.1) * 20;
      
      // Age and gender adjustments (simplified)
      let ageAdjustment = 1.0;
      if (age) {
        if (condition.category === 'Cardiovascular' && age > 50) ageAdjustment = 1.2;
        if (condition.category === 'Pediatric' && age < 18) ageAdjustment = 1.3;
      }

      const finalProbability = Math.min(95, 
        (baseConfidence + prevalenceBoost) * ageAdjustment
      );

      return {
        condition_id: condition.id,
        name: condition.name,
        description: condition.description || condition.short_description || '',
        probability: Math.round(finalProbability * 10) / 10
      };
    });

    // Sort by probability
    const sortedDiagnoses = diagnoses
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);

    console.log('Generated diagnoses:', sortedDiagnoses);

    return new Response(
      JSON.stringify(sortedDiagnoses),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in diagnose:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});