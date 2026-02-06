import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  symptomIds: z.array(z.number().int().positive()).min(1).max(50),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.string().max(20).optional(),
});

interface DiagnosisResult {
  condition_id: number;
  name: string;
  description: string;
  probability: number;
  drug_name: string;
  dosage: string;
  notes: string;
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

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { symptomIds, age, gender } = validation.data;
    console.log('Diagnosing with symptoms:', symptomIds, 'age:', age, 'gender:', gender);

    const { data: conditionSymptoms, error: csError } = await supabase
      .from('condition_symptoms')
      .select(`condition_id, symptom_id, weight, conditions(id, name, description, prevalence, is_rare)`)
      .in('symptom_id', symptomIds);

    if (csError) { console.error('Error fetching condition symptoms:', csError); throw csError; }

    if (!conditionSymptoms || conditionSymptoms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No matching conditions found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conditionScores = new Map<number, { condition: any; totalWeight: number; matchedSymptoms: number; prevalence: number; }>();

    for (const cs of conditionSymptoms) {
      if (!cs.conditions) continue;
      const conditionId = cs.condition_id;
      const weight = cs.weight || 1.0;
      const prevalence = cs.conditions.prevalence || 0.1;
      if (!conditionScores.has(conditionId)) {
        conditionScores.set(conditionId, { condition: cs.conditions, totalWeight: 0, matchedSymptoms: 0, prevalence });
      }
      const score = conditionScores.get(conditionId)!;
      score.totalWeight += weight;
      score.matchedSymptoms += 1;
    }

    const diagnoses: Array<{ condition_id: number; name: string; description: string; probability: number; prevalence: number; is_rare: boolean; }> = [];

    for (const [conditionId, score] of conditionScores.entries()) {
      const likelihoodScore = Math.min(1.0, score.totalWeight / symptomIds.length);
      const prior = score.prevalence;
      let ageAdjustment = 1.0;
      if (age) { if (age < 18) ageAdjustment = 0.8; if (age > 65) ageAdjustment = 1.2; }
      const probability = likelihoodScore * prior * ageAdjustment;
      diagnoses.push({
        condition_id: conditionId, name: score.condition.name,
        description: score.condition.description || '',
        probability: Math.round(probability * 1000) / 1000,
        prevalence: score.prevalence, is_rare: score.condition.is_rare || false
      });
    }

    const topDiagnoses = diagnoses.sort((a, b) => b.probability - a.probability).slice(0, 3);
    const results: DiagnosisResult[] = [];

    for (const diagnosis of topDiagnoses) {
      const { data: drugRecs } = await supabase
        .from('drug_recommendations').select('drug_name, dosage, notes')
        .eq('condition_id', diagnosis.condition_id).limit(1);
      const drugRec = drugRecs?.[0];
      results.push({
        condition_id: diagnosis.condition_id, name: diagnosis.name,
        description: diagnosis.description, probability: diagnosis.probability,
        drug_name: drugRec?.drug_name || 'Consult healthcare provider',
        dosage: drugRec?.dosage || 'As prescribed',
        notes: drugRec?.notes || 'Follow medical advice'
      });
    }

    console.log(`Generated ${results.length} diagnoses for ${symptomIds.length} symptoms`);
    return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in diagnose-with-bayesian:', error);
    return new Response(
      JSON.stringify({ error: 'Diagnosis failed', results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
