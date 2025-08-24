import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers } = await req.json(); // user answers passed from frontend

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing diagnosis with answers:', answers);

    // Fetch conditions from Supabase
    const { data: conditions, error } = await supabase
      .from("conditions")
      .select("id, name, symptoms, drug_recommendations");

    if (error) {
      console.error('Error fetching conditions:', error);
      throw error;
    }

    console.log(`Found ${conditions?.length} conditions`);

    let bestMatch = null;
    let bestScore = 0;

    // Simple symptom overlap scoring
    for (const condition of conditions || []) {
      if (!condition.symptoms || !Array.isArray(condition.symptoms)) continue;
      
      const conditionSymptoms = condition.symptoms.map((s: string) => s.toLowerCase());
      const userAnswers = answers.map((a: string) => a.toLowerCase());
      
      // Calculate overlap - count how many user answers match condition symptoms
      const overlap = userAnswers.filter((answer: string) => 
        conditionSymptoms.some((symptom: string) => 
          symptom.includes(answer) || answer.includes(symptom) || answer === 'yes'
        )
      );
      
      const score = (overlap.length / Math.max(condition.symptoms.length, answers.length)) * 100;

      console.log(`Condition: ${condition.name}, Score: ${score}%`);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = condition;
      }
    }

    console.log(`Best match: ${bestMatch?.name} with score: ${bestScore}%`);

    if (bestMatch && bestScore >= 80) {
      // Extract drug recommendation
      let drugName = 'Consult your doctor';
      if (bestMatch.drug_recommendations && Array.isArray(bestMatch.drug_recommendations)) {
        const firstDrug = bestMatch.drug_recommendations[0];
        if (typeof firstDrug === 'object' && firstDrug.drug) {
          drugName = firstDrug.drug;
        } else if (typeof firstDrug === 'string') {
          drugName = firstDrug;
        }
      }

      return new Response(
        JSON.stringify({
          condition: bestMatch.name,
          accuracy: Math.round(bestScore),
          drug: drugName,
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          message: "We couldn't find a strong match. Please consult a doctor directly.",
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    }
  } catch (err) {
    console.error('Diagnosis error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});