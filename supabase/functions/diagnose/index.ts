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

    const { symptomIds, age, gender, locale = 'en' } = await req.json();
    
    if (!symptomIds || !Array.isArray(symptomIds) || symptomIds.length === 0) {
      return new Response(
        JSON.stringify({ top: [], rareFlag: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Diagnosing with symptoms:', symptomIds, 'age:', age, 'gender:', gender);

    // Get all conditions with their prevalence
    const { data: conditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('id, name, description, prevalence, is_rare');

    if (conditionsError) {
      console.error('Error fetching conditions:', conditionsError);
      return new Response(
        JSON.stringify({ top: [], rareFlag: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get condition-symptom relationships
    const { data: conditionSymptoms, error: csError } = await supabase
      .from('condition_symptoms')
      .select('condition_id, symptom_id, weight')
      .in('symptom_id', symptomIds);

    if (csError) {
      console.error('Error fetching condition-symptoms:', csError);
    }

    console.log('Found condition-symptoms:', conditionSymptoms?.length || 0);

    // Calculate Bayesian probabilities
    const diagnoses: DiagnosisResult[] = [];
    
    conditions?.forEach(condition => {
      // Prior probability (prevalence)
      let prior = condition.prevalence || 0.1;
      
      // Adjust prior based on demographics (simple adjustments)
      if (age && age > 65) {
        prior *= 1.2; // Older patients more likely to have various conditions
      }
      if (age && age < 18) {
        prior *= 0.8; // Younger patients less likely to have chronic conditions
      }

      // Calculate likelihood based on symptoms
      const relevantSymptoms = conditionSymptoms?.filter(cs => cs.condition_id === condition.id) || [];
      
      if (relevantSymptoms.length === 0) {
        // No symptoms match this condition, very low probability
        diagnoses.push({
          condition_id: condition.id,
          name: condition.name,
          description: condition.description,
          probability: prior * 0.01 // Very low but not zero
        });
        return;
      }

      // Calculate likelihood product (in log space to avoid underflow)
      let logLikelihood = 0;
      const matchedSymptoms = relevantSymptoms.length;
      
      relevantSymptoms.forEach(symptom => {
        const weight = symptom.weight || 0.5;
        logLikelihood += Math.log(weight);
      });

      // Add penalty for unmatched symptoms that should be present
      const expectedSymptoms = Math.max(matchedSymptoms * 1.5, 3);
      const missedSymptoms = Math.max(0, expectedSymptoms - matchedSymptoms);
      logLikelihood -= missedSymptoms * 0.3;

      // Convert back from log space
      const likelihood = Math.exp(logLikelihood);
      
      // Bayesian calculation: P(condition|symptoms) ∝ P(symptoms|condition) * P(condition)
      const posterior = likelihood * prior;
      
      // Boost score if we have good symptom matches
      const boostedPosterior = posterior * (1 + matchedSymptoms * 0.2);
      
      diagnoses.push({
        condition_id: condition.id,
        name: condition.name,
        description: condition.description,
        probability: boostedPosterior
      });
    });

    // Normalize probabilities to percentages
    const totalProb = diagnoses.reduce((sum, d) => sum + d.probability, 0);
    if (totalProb > 0) {
      diagnoses.forEach(d => {
        d.probability = (d.probability / totalProb) * 100;
      });
    }

    // Sort by probability and get top 3
    diagnoses.sort((a, b) => b.probability - a.probability);
    const top3 = diagnoses.slice(0, 3);

    // Check for rare conditions flag
    const rareFlag = top3.some(d => {
      const condition = conditions?.find(c => c.id === d.condition_id);
      return condition?.is_rare || false;
    });

    console.log('Top diagnoses:', top3);

    return new Response(
      JSON.stringify({
        top: top3,
        rareFlag
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in diagnose:', error);
    return new Response(
      JSON.stringify({ 
        top: [], 
        rareFlag: false,
        error: 'Diagnosis failed' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});