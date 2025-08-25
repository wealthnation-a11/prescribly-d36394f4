import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SymptomInput {
  text: string;
  confidence?: number;
}

interface UserDemographics {
  age?: number;
  gender?: string;
  location?: string;
  medicalHistory?: string[];
}

interface BayesianResult {
  condition: string;
  conditionId: number;
  probability: number;
  confidence: number;
  explanation: string;
  symptoms: string[];
  drugRecommendations: any[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      symptoms, 
      demographics, 
      sessionId,
      freeTextInput 
    }: { 
      symptoms: SymptomInput[];
      demographics: UserDemographics;
      sessionId: string;
      freeTextInput?: string;
    } = await req.json();

    console.log('Bayesian diagnosis request:', { symptoms, demographics, sessionId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse free text input using NLP if provided
    let parsedSymptoms = symptoms || [];
    if (freeTextInput) {
      parsedSymptoms = await parseSymptoms(supabase, freeTextInput);
    }

    // Get all conditions with their symptom probabilities
    const { data: conditionData, error: conditionError } = await supabase
      .from('conditions')
      .select(`
        id, name, short_description, symptoms, drug_recommendations, total_case_count,
        condition_symptoms:condition_symptoms(
          symptom_id, probability, weight,
          symptoms:symptoms(name, severity_weight)
        )
      `);

    if (conditionError) {
      console.error('Error fetching conditions:', conditionError);
      throw conditionError;
    }

    console.log(`Found ${conditionData?.length} conditions`);

    // Calculate Bayesian probabilities
    const results = await calculateBayesianProbabilities(
      conditionData || [], 
      parsedSymptoms, 
      demographics
    );

    // Sort by probability and take top results
    const topResults = results
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);

    console.log('Top results:', topResults.map(r => ({
      condition: r.condition,
      probability: r.probability,
      confidence: r.confidence
    })));

    // Store results in user history
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_history').insert({
        user_id: user.id,
        session_id: sessionId,
        symptoms_reported: parsedSymptoms.map(s => s.text),
        bayesian_results: topResults,
        user_demographics: demographics
      });
    }

    // Determine if we should ask more questions
    const needsMoreInfo = shouldAskMoreQuestions(topResults, parsedSymptoms);
    const nextQuestion = needsMoreInfo ? await getNextBestQuestion(supabase, topResults, parsedSymptoms) : null;

    return new Response(JSON.stringify({
      results: topResults,
      needsMoreInfo,
      nextQuestion,
      sessionId,
      totalSymptoms: parsedSymptoms.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Bayesian diagnosis error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred during diagnosis'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// NLP function to parse free text symptoms
async function parseSymptoms(supabase: any, freeText: string): Promise<SymptomInput[]> {
  const { data: symptoms } = await supabase
    .from('symptoms')
    .select('id, name, aliases');

  const parsedSymptoms: SymptomInput[] = [];
  const text = freeText.toLowerCase();

  for (const symptom of symptoms || []) {
    // Check direct name match
    if (text.includes(symptom.name.toLowerCase())) {
      parsedSymptoms.push({
        text: symptom.name,
        confidence: 0.9
      });
      continue;
    }

    // Check aliases
    for (const alias of symptom.aliases || []) {
      if (text.includes(alias.toLowerCase())) {
        parsedSymptoms.push({
          text: symptom.name,
          confidence: 0.8
        });
        break;
      }
    }

    // Fuzzy matching for typos (simple approach)
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && symptom.name.toLowerCase().includes(word)) {
        parsedSymptoms.push({
          text: symptom.name,
          confidence: 0.6
        });
        break;
      }
    }
  }

  return parsedSymptoms;
}

// Core Bayesian probability calculation
async function calculateBayesianProbabilities(
  conditions: any[], 
  symptoms: SymptomInput[], 
  demographics: UserDemographics
): Promise<BayesianResult[]> {
  const results: BayesianResult[] = [];

  for (const condition of conditions) {
    // Prior probability P(condition) - based on prevalence
    const prior = calculatePrior(condition, demographics);
    
    // Likelihood P(symptoms | condition)
    const likelihood = calculateLikelihood(condition, symptoms);
    
    // Posterior probability P(condition | symptoms) ∝ P(condition) × P(symptoms | condition)
    const posterior = prior * likelihood;
    
    const confidence = calculateConfidence(condition, symptoms);
    const riskLevel = assessRiskLevel(condition, symptoms);
    
    results.push({
      condition: condition.name,
      conditionId: condition.id,
      probability: Math.min(posterior * 100, 99), // Cap at 99%
      confidence,
      explanation: generateExplanation(condition, symptoms, posterior),
      symptoms: symptoms.map(s => s.text),
      drugRecommendations: condition.drug_recommendations || [],
      riskLevel
    });
  }

  return results;
}

function calculatePrior(condition: any, demographics: UserDemographics): number {
  let prior = 0.1; // Base prior

  // Adjust based on prevalence data
  if (condition.total_case_count) {
    prior = Math.min(condition.total_case_count / 1000000, 0.5); // Normalize
  }

  // Demographic adjustments
  if (demographics.age) {
    // Age-based adjustments (simplified)
    if (demographics.age > 65 && condition.name.includes('heart')) prior *= 2;
    if (demographics.age < 18 && condition.name.includes('childhood')) prior *= 3;
  }

  return Math.max(prior, 0.001); // Minimum prior
}

function calculateLikelihood(condition: any, symptoms: SymptomInput[]): number {
  if (!symptoms.length) return 0.1;

  let likelihood = 1.0;
  const conditionSymptoms = condition.symptoms || [];

  for (const symptom of symptoms) {
    // Find matching symptoms in condition
    const match = conditionSymptoms.find((cs: string) => 
      cs.toLowerCase().includes(symptom.text.toLowerCase()) ||
      symptom.text.toLowerCase().includes(cs.toLowerCase())
    );

    if (match) {
      // Symptom is associated with this condition
      likelihood *= 0.8; // P(symptom | condition)
    } else {
      // Symptom not strongly associated
      likelihood *= 0.3;
    }
  }

  return Math.max(likelihood, 0.001);
}

function calculateConfidence(condition: any, symptoms: SymptomInput[]): number {
  const matchingSymptoms = symptoms.filter(s => 
    condition.symptoms?.some((cs: string) => 
      cs.toLowerCase().includes(s.text.toLowerCase())
    )
  );

  const confidence = matchingSymptoms.length / Math.max(symptoms.length, 1);
  return Math.round(confidence * 100);
}

function assessRiskLevel(condition: any, symptoms: SymptomInput[]): 'low' | 'medium' | 'high' | 'critical' {
  const criticalSymptoms = ['chest pain', 'difficulty breathing', 'severe headache'];
  const highRiskConditions = ['heart attack', 'stroke', 'appendicitis'];
  
  const hasCriticalSymptom = symptoms.some(s => 
    criticalSymptoms.some(cs => s.text.toLowerCase().includes(cs))
  );
  
  const isHighRiskCondition = highRiskConditions.some(hrc => 
    condition.name.toLowerCase().includes(hrc)
  );

  if (hasCriticalSymptom || isHighRiskCondition) return 'critical';
  if (symptoms.length > 5) return 'high';
  if (symptoms.length > 2) return 'medium';
  return 'low';
}

function generateExplanation(condition: any, symptoms: SymptomInput[], probability: number): string {
  const matchCount = symptoms.filter(s => 
    condition.symptoms?.some((cs: string) => 
      cs.toLowerCase().includes(s.text.toLowerCase())
    )
  ).length;

  return `Based on ${matchCount} of ${symptoms.length} reported symptoms matching ${condition.name}. ` +
         `This condition typically presents with: ${condition.short_description || 'similar symptoms'}.`;
}

function shouldAskMoreQuestions(results: BayesianResult[], symptoms: SymptomInput[]): boolean {
  const topResult = results[0];
  
  // Ask more questions if:
  // 1. Top probability is below 70%
  // 2. Top two results are very close (within 10%)
  // 3. We have less than 5 symptoms
  
  if (!topResult) return true;
  if (topResult.probability < 70) return true;
  if (symptoms.length < 5) return true;
  if (results.length > 1 && (topResult.probability - results[1].probability) < 10) return true;
  
  return false;
}

async function getNextBestQuestion(supabase: any, results: BayesianResult[], currentSymptoms: SymptomInput[]): Promise<any> {
  // Get diagnostic questions that could help differentiate top conditions
  const { data: questions } = await supabase
    .from('diagnostic_questions')
    .select('*')
    .limit(10);

  if (!questions?.length) return null;

  // Simple selection - pick a random question not related to current symptoms
  const currentSymptomTexts = currentSymptoms.map(s => s.text.toLowerCase());
  const unusedQuestions = questions.filter(q => 
    !currentSymptomTexts.some(st => q.question_text.toLowerCase().includes(st))
  );

  return unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)] || questions[0];
}