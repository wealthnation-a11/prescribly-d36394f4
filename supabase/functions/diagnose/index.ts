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
  is_rare: boolean;
  explain: {
    positives: string[];
    negatives: string[];
  };
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

    const { matchedConditions, symptomIds, age, gender, session_id } = await req.json();
    
    if (!matchedConditions || matchedConditions.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Diagnosing conditions:', matchedConditions);

    // Build evidence from multiple sources
    const evidence: string[] = [];
    
    // Extract evidence from matched conditions
    for (const match of matchedConditions) {
      if (match.name) evidence.push(match.name.toLowerCase());
      if (match.alias) evidence.push(match.alias.toLowerCase());
    }
    
    // Add symptom IDs if provided
    if (Array.isArray(symptomIds)) {
      evidence.push(...symptomIds.map(String));
    }

    console.log('Evidence terms:', evidence);

    // Get condition IDs to analyze
    const conditionIds = matchedConditions.map((c: any) => c.condition_id || c.id);

    // Fetch candidate conditions
    const { data: conditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('*')
      .in('id', conditionIds)
      .limit(50);

    if (conditionsError) {
      console.error('Error fetching conditions:', conditionsError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Bayesian-style scoring
    const diagnoses: DiagnosisResult[] = [];

    if (conditions) {
      for (const condition of conditions) {
        // Find matching input condition
        const matchedCondition = matchedConditions.find((c: any) => 
          (c.condition_id || c.id) === condition.id
        );
        
        if (!matchedCondition) continue;

        // Start with prior probability (prevalence)
        let prior = condition.prevalence || 0.001; // Default low prior
        if (condition.is_rare) prior *= 0.5; // Reduce rare condition priors

        // Calculate likelihood based on evidence
        let likelihood = (matchedCondition.confidence || 50) / 100;
        
        // Boost likelihood for exact name matches
        if (matchedCondition.source === 'direct') {
          likelihood *= 1.3;
        }

        // Demographic adjustments
        if (age) {
          const ageNum = parseInt(age);
          // Age-specific condition adjustments
          if (ageNum > 65 && condition.category?.includes('geriatric')) {
            likelihood *= 1.2;
          }
          if (ageNum < 18 && condition.category?.includes('pediatric')) {
            likelihood *= 1.3;
          }
          if (ageNum >= 18 && ageNum <= 65 && condition.category?.includes('adult')) {
            likelihood *= 1.1;
          }
        }

        if (gender) {
          // Gender-specific adjustments
          const conditionName = condition.name.toLowerCase();
          if (gender === 'female' && (conditionName.includes('pregnancy') || conditionName.includes('menstrual'))) {
            likelihood *= 1.4;
          }
          if (gender === 'male' && conditionName.includes('prostate')) {
            likelihood *= 1.4;
          }
        }

        // Calculate posterior probability using simplified Bayes
        // P(condition|symptoms) ∝ P(symptoms|condition) × P(condition)
        const rawScore = likelihood * prior;
        
        // Normalize to percentage (0-100)
        const probability = Math.min(95, Math.max(1, rawScore * 1000));

        diagnoses.push({
          condition_id: condition.id,
          name: condition.name || 'Unknown Condition',
          description: condition.description || condition.short_description || '',
          probability: Math.round(probability),
          is_rare: condition.is_rare || false,
          explain: {
            positives: evidence.slice(0, 5), // Limit explanation terms
            negatives: []
          }
        });
      }
    }

    // Sort by probability and normalize
    const sortedDiagnoses = diagnoses
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);

    // Ensure probabilities sum to reasonable total (softmax-like normalization)
    if (sortedDiagnoses.length > 0) {
      const totalProb = sortedDiagnoses.reduce((sum, d) => sum + d.probability, 0);
      if (totalProb > 100) {
        const factor = 100 / totalProb;
        sortedDiagnoses.forEach(d => {
          d.probability = Math.max(1, Math.round(d.probability * factor));
        });
      }
    }

    // Save to session if provided
    if (session_id) {
      await supabase.from('user_sessions').upsert({
        id: session_id,
        path: 'results',
        payload: { evidence, results: sortedDiagnoses.slice(0, 5) },
        updated_at: new Date().toISOString()
      });
    }

    console.log('Generated diagnoses:', sortedDiagnoses.slice(0, 5));

    return new Response(
      JSON.stringify({ 
        results: sortedDiagnoses, 
        timestamp: Date.now(),
        evidence_count: evidence.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in diagnose function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});