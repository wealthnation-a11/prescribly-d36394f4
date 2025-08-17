import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosisRequest {
  symptoms: string[];
  duration: string;
  age: number;
  gender: string;
  consent: boolean;
}

interface Condition {
  id: number;
  name: string;
  short_description: string;
  symptoms: string[];
  drug_recommendations: any;
  drug_usage?: any;
  total_case_count?: number;
}

interface DiagnosisResult {
  condition: string;
  probability: number;
  description: string;
  drug_recommendations: any;
  drug_usage?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Rate limiting - check requests in last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentRequests } = await supabase
      .from('api_rate_limits')
      .select('request_count')
      .eq('user_id', user.id)
      .eq('endpoint', 'diagnose')
      .gte('window_start', oneMinuteAgo);

    const totalRequests = recentRequests?.reduce((sum, r) => sum + r.request_count, 0) || 0;
    if (totalRequests >= 10) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 10 requests per minute.' }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log this request
    await supabase.from('api_rate_limits').insert({
      user_id: user.id,
      endpoint: 'diagnose',
      request_count: 1,
      window_start: new Date().toISOString()
    });

    const body: DiagnosisRequest = await req.json();
    
    if (!body.consent) {
      throw new Error('Consent is required');
    }

    if (!body.symptoms || body.symptoms.length === 0 || body.symptoms.length > 20) {
      throw new Error('Invalid symptoms: must provide 1-20 symptoms');
    }

    // Fetch all conditions from database
    const { data: conditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('id, name, short_description, symptoms, drug_recommendations, drug_usage, total_case_count');

    if (conditionsError) {
      throw new Error('Failed to fetch conditions');
    }

    // Bayesian diagnosis calculation
    const results = calculateBayesianDiagnosis(conditions as Condition[], body.symptoms);

    // Save successful check to database
    await supabase.from('wellness_checks').insert({
      user_id: user.id,
      entered_symptoms: body.symptoms,
      calculated_probabilities: results,
      suggested_drugs: results.map(r => r.drug_recommendations),
      age: body.age,
      gender: body.gender,
      duration: body.duration,
      consent_timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ results }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Diagnosis error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: error.message?.includes('Rate limit') ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateBayesianDiagnosis(conditions: Condition[], inputSymptoms: string[]): DiagnosisResult[] {
  const results: DiagnosisResult[] = [];
  
  // Calculate total prevalence for uniform prior
  const totalCases = conditions.reduce((sum, c) => sum + (c.total_case_count || 1), 0);
  
  // Symptom frequency analysis for down-weighting common symptoms
  const symptomFrequency: Record<string, number> = {};
  conditions.forEach(condition => {
    if (condition.symptoms) {
      condition.symptoms.forEach(symptom => {
        symptomFrequency[symptom.toLowerCase()] = (symptomFrequency[symptom.toLowerCase()] || 0) + 1;
      });
    }
  });
  
  const maxFrequency = Math.max(...Object.values(symptomFrequency));
  
  for (const condition of conditions) {
    if (!condition.symptoms || !Array.isArray(condition.symptoms)) continue;
    
    // Prior probability based on prevalence or uniform
    const prior = condition.total_case_count ? 
      Math.log(condition.total_case_count / totalCases) : 
      Math.log(1 / conditions.length);
    
    // Likelihood calculation using Bernoulli Naive Bayes with Laplace smoothing
    let logLikelihood = 0;
    const conditionSymptoms = condition.symptoms.map(s => s.toLowerCase());
    const vocabularySize = Object.keys(symptomFrequency).length;
    
    for (const inputSymptom of inputSymptoms) {
      const symptomLower = inputSymptom.toLowerCase();
      
      // Check if symptom matches condition
      const hasSymptom = conditionSymptoms.some(cs => 
        cs.includes(symptomLower) || symptomLower.includes(cs)
      );
      
      // Laplace smoothing: add 1 to numerator, add 2 to denominator
      const symptomCount = hasSymptom ? 1 : 0;
      const probability = (symptomCount + 1) / (conditionSymptoms.length + 2);
      
      // Down-weight common symptoms
      const frequency = symptomFrequency[symptomLower] || 1;
      const weight = 1 - (frequency / maxFrequency) * 0.5; // Reduce weight by up to 50%
      
      logLikelihood += Math.log(probability) * weight;
    }
    
    // Posterior = Prior + Likelihood (in log space)
    const logPosterior = prior + logLikelihood;
    
    results.push({
      condition: condition.name,
      probability: Math.exp(logPosterior),
      description: condition.short_description || '',
      drug_recommendations: condition.drug_recommendations,
      drug_usage: condition.drug_usage
    });
  }
  
  // Normalize probabilities
  const totalProb = results.reduce((sum, r) => sum + r.probability, 0);
  if (totalProb > 0) {
    results.forEach(r => {
      r.probability = (r.probability / totalProb) * 100;
    });
  }
  
  // Return top 3 results
  return results
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .map(r => ({
      ...r,
      probability: Math.round(r.probability * 100) / 100
    }));
}