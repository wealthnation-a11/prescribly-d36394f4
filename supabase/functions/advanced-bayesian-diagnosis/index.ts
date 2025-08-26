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
  description: string;
  prevalence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      freeTextInput,
      symptoms: providedSymptoms,
      demographics, 
      sessionId
    }: { 
      freeTextInput?: string;
      symptoms?: SymptomInput[];
      demographics?: UserDemographics;
      sessionId: string;
    } = await req.json();

    console.log('Advanced Bayesian diagnosis request:', { freeTextInput, providedSymptoms, demographics, sessionId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse symptoms from free text using advanced NLP
    let parsedSymptoms: SymptomInput[] = providedSymptoms || [];
    if (freeTextInput) {
      const nlpResults = await parseSymptoms(supabase, freeTextInput);
      parsedSymptoms = [...parsedSymptoms, ...nlpResults];
    }

    console.log('Parsed symptoms:', parsedSymptoms);

    // Get comprehensive condition data with relationships
    const { data: conditionData, error: conditionError } = await supabase
      .from('conditions')
      .select(`
        id, name, description, prevalence, is_rare,
        condition_symptoms!inner(
          symptom_id, weight,
          symptoms!inner(name, description)
        )
      `);

    if (conditionError) {
      console.error('Error fetching conditions:', conditionError);
      throw conditionError;
    }

    // Get drug recommendations for all conditions
    const { data: drugData } = await supabase
      .from('drug_recommendations')
      .select('*');

    console.log(`Found ${conditionData?.length} conditions for analysis`);

    // Calculate advanced Bayesian probabilities
    const results = await calculateAdvancedBayesianProbabilities(
      conditionData || [], 
      parsedSymptoms, 
      demographics || {},
      drugData || []
    );

    // Sort by probability and take top results
    const topResults = results
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);

    console.log('Top Bayesian results:', topResults.map(r => ({
      condition: r.condition,
      probability: r.probability,
      confidence: r.confidence
    })));

    // Store interaction in user history
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_history').insert({
        user_id: user.id,
        session_id: sessionId,
        symptoms_reported: parsedSymptoms.map(s => s.text),
        bayesian_results: topResults,
        user_demographics: demographics,
        symptoms_parsed: parsedSymptoms.map(s => s.text)
      });
    }

    // Advanced question selection for follow-ups
    const needsMoreInfo = shouldAskMoreQuestions(topResults, parsedSymptoms);
    const nextQuestion = needsMoreInfo ? await getNextOptimalQuestion(supabase, topResults, parsedSymptoms) : null;

    return new Response(JSON.stringify({
      results: topResults,
      needsMoreInfo,
      nextQuestion,
      sessionId,
      totalSymptoms: parsedSymptoms.length,
      analysisMetadata: {
        symptomsParsed: parsedSymptoms.length,
        conditionsAnalyzed: conditionData?.length || 0,
        confidenceThreshold: 80,
        algorithm: 'Advanced Bayesian Inference v2.0'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Advanced Bayesian diagnosis error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred during advanced diagnosis',
      suggestion: 'Please try again with different symptoms or consult a medical professional'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Advanced NLP symptom parsing with fuzzy matching and aliases
async function parseSymptoms(supabase: any, freeText: string): Promise<SymptomInput[]> {
  const { data: symptoms } = await supabase
    .from('symptoms')
    .select('id, name, description');
    
  const { data: aliases } = await supabase
    .from('condition_aliases')
    .select('alias');

  const parsedSymptoms: SymptomInput[] = [];
  const text = freeText.toLowerCase();
  
  // Advanced pattern matching
  const words = text.split(/[\s,;.]+/).filter(w => w.length > 2);

  for (const symptom of symptoms || []) {
    let confidence = 0;
    const symptomName = symptom.name.toLowerCase();
    
    // Exact match (highest confidence)
    if (text.includes(symptomName)) {
      confidence = 0.95;
    }
    // Partial word match
    else {
      for (const word of words) {
        if (symptomName.includes(word) && word.length > 3) {
          confidence = Math.max(confidence, 0.7);
        }
        // Levenshtein distance for typos
        if (levenshteinDistance(word, symptomName) <= 2 && word.length > 4) {
          confidence = Math.max(confidence, 0.6);
        }
      }
    }
    
    if (confidence > 0.5) {
      parsedSymptoms.push({
        text: symptom.name,
        confidence
      });
    }
  }

  // Remove duplicates and sort by confidence
  const uniqueSymptoms = parsedSymptoms.reduce((acc, current) => {
    const existing = acc.find(s => s.text === current.text);
    if (!existing || current.confidence > existing.confidence) {
      return [...acc.filter(s => s.text !== current.text), current];
    }
    return acc;
  }, [] as SymptomInput[]);

  return uniqueSymptoms.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
}

// Advanced Bayesian calculation with demographic adjustments
async function calculateAdvancedBayesianProbabilities(
  conditions: any[], 
  symptoms: SymptomInput[], 
  demographics: UserDemographics,
  drugData: any[]
): Promise<BayesianResult[]> {
  const results: BayesianResult[] = [];

  for (const condition of conditions) {
    // Enhanced prior calculation with demographic adjustments
    let prior = condition.prevalence || 0.1;
    
    // Age-based adjustments
    if (demographics.age) {
      if (demographics.age > 60 && ['Hypertension', 'Type 2 Diabetes'].includes(condition.name)) {
        prior *= 2.0;
      }
      if (demographics.age < 30 && condition.name === 'Migraine') {
        prior *= 1.5;
      }
    }
    
    // Gender-based adjustments  
    if (demographics.gender) {
      if (demographics.gender === 'female' && condition.name === 'Migraine') {
        prior *= 1.8;
      }
    }

    // Calculate likelihood using weighted symptom probabilities
    let likelihood = 1.0;
    let matchingSymptoms = 0;
    let totalSymptomWeight = 0;
    
    const conditionSymptoms = condition.condition_symptoms || [];
    
    for (const symptom of symptoms) {
      const match = conditionSymptoms.find((cs: any) => 
        cs.symptoms?.name?.toLowerCase() === symptom.text.toLowerCase()
      );
      
      if (match) {
        // Weight by both condition weight and symptom confidence
        const weight = (match.weight || 1.0) * (symptom.confidence || 1.0);
        likelihood *= (0.7 + weight * 0.3); // Enhanced likelihood calculation
        matchingSymptoms++;
        totalSymptomWeight += weight;
      } else {
        // Penalize for unrelated symptoms but not too severely
        likelihood *= 0.85;
      }
    }
    
    // Posterior probability calculation
    const posterior = prior * likelihood;
    
    // Enhanced confidence calculation
    const confidence = Math.min(95, 
      (matchingSymptoms / Math.max(symptoms.length, 1)) * 100 * 
      (totalSymptomWeight / Math.max(matchingSymptoms, 1))
    );
    
    // Risk assessment
    const riskLevel = assessRiskLevel(condition, symptoms, posterior);
    
    // Get drug recommendations
    const conditionDrugs = drugData.filter(d => d.condition_id === condition.id);
    
    results.push({
      condition: condition.name,
      conditionId: condition.id,
      probability: Math.min(posterior * 100, 99),
      confidence: Math.round(confidence),
      explanation: generateAdvancedExplanation(condition, symptoms, matchingSymptoms, posterior),
      symptoms: symptoms.map(s => s.text),
      drugRecommendations: conditionDrugs.map(d => ({
        drug: d.drug_name,
        dosage: d.dosage,
        notes: d.notes
      })),
      riskLevel,
      description: condition.description || '',
      prevalence: condition.prevalence || 0.1
    });
  }

  return results;
}

function assessRiskLevel(condition: any, symptoms: SymptomInput[], probability: number): 'low' | 'medium' | 'high' | 'critical' {
  // Critical symptoms that require immediate attention
  const criticalSymptoms = [
    'chest pain', 'difficulty breathing', 'shortness of breath', 
    'severe headache', 'loss of consciousness', 'severe abdominal pain'
  ];
  
  const hasCriticalSymptom = symptoms.some(s => 
    criticalSymptoms.some(cs => s.text.toLowerCase().includes(cs))
  );
  
  if (hasCriticalSymptom) return 'critical';
  
  // High-risk conditions
  const highRiskConditions = ['pneumonia', 'heart attack', 'stroke', 'appendicitis'];
  const isHighRiskCondition = highRiskConditions.some(hrc => 
    condition.name.toLowerCase().includes(hrc)
  );
  
  if (isHighRiskCondition && probability > 0.6) return 'high';
  if (probability > 0.8) return 'high';
  if (probability > 0.5 || symptoms.length > 5) return 'medium';
  return 'low';
}

function generateAdvancedExplanation(condition: any, symptoms: SymptomInput[], matches: number, probability: number): string {
  const confidence = Math.round(probability * 100);
  return `Based on ${matches} of ${symptoms.length} symptoms matching ${condition.name}, ` +
         `with ${confidence}% Bayesian probability. ${condition.description || ''}`;
}

function shouldAskMoreQuestions(results: BayesianResult[], symptoms: SymptomInput[]): boolean {
  if (!results.length) return true;
  
  const topResult = results[0];
  
  // Ask more if confidence is low or results are close
  if (topResult.probability < 75) return true;
  if (symptoms.length < 4) return true;
  if (results.length > 1 && (topResult.probability - results[1].probability) < 15) return true;
  
  return false;
}

async function getNextOptimalQuestion(supabase: any, results: BayesianResult[], currentSymptoms: SymptomInput[]): Promise<any> {
  // Get questions that could help differentiate top conditions
  const { data: questions } = await supabase
    .from('diagnostic_questions')
    .select('*')
    .limit(20);

  if (!questions?.length) return null;

  // Select questions not already covered
  const currentSymptomTexts = currentSymptoms.map(s => s.text.toLowerCase());
  const unusedQuestions = questions.filter(q => 
    !currentSymptomTexts.some(st => 
      q.question_text.toLowerCase().includes(st) || 
      st.includes(q.question_text.toLowerCase())
    )
  );

  return unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)] || questions[0];
}

// Simple Levenshtein distance for typo detection
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}