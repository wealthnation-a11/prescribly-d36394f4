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

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { symptoms } = await req.json();

    // Input validation
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Symptoms array is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize symptoms
    const sanitizedSymptoms = symptoms
      .slice(0, 10)
      .map(symptom => String(symptom).trim().substring(0, 300))
      .filter(symptom => symptom.length > 0);

    console.log('Processing symptoms:', sanitizedSymptoms);

    // Create diagnosis session
    const { data: sessionData, error: sessionError } = await supabase
      .from('diagnosis_sessions')
      .insert({
        patient_id: user.id,
        symptoms_text: sanitizedSymptoms.join(', '),
        selected_symptoms: sanitizedSymptoms,
        doctor_review_status: 'pending'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating diagnosis session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create diagnosis session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulate AI diagnostic engine by matching symptoms to conditions
    const { data: conditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('*')
      .limit(20);

    if (conditionsError) {
      console.error('Error fetching conditions:', conditionsError);
    }

    // Generate mock diagnosis results
    const results = generateMockDiagnosis(sanitizedSymptoms, conditions || []);

    console.log('Generated diagnosis results:', results);

    return new Response(
      JSON.stringify({
        sessionId: sessionData.id,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in diagnose function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateMockDiagnosis(symptoms: string[], conditions: any[]) {
  // Mock diagnostic logic - in real implementation this would use AI/ML
  const mockConditions = [
    { name: "Malaria", baseProb: 0.8, keywords: ["fever", "headache", "chills", "sweating", "nausea"] },
    { name: "Typhoid", baseProb: 0.7, keywords: ["fever", "headache", "weakness", "abdominal", "loss of appetite"] },
    { name: "Common Cold", baseProb: 0.6, keywords: ["cough", "runny nose", "sneezing", "sore throat", "congestion"] },
    { name: "Flu", baseProb: 0.65, keywords: ["fever", "body aches", "fatigue", "cough", "headache"] },
    { name: "Gastroenteritis", baseProb: 0.55, keywords: ["nausea", "vomiting", "diarrhea", "abdominal pain", "cramping"] },
    { name: "Migraine", baseProb: 0.7, keywords: ["headache", "nausea", "sensitivity to light", "visual disturbance"] },
    { name: "Hypertension", baseProb: 0.4, keywords: ["headache", "dizziness", "chest pain", "shortness of breath"] }
  ];

  const symptomText = symptoms.join(' ').toLowerCase();
  
  // Calculate probability scores based on keyword matching
  const scoredConditions = mockConditions.map(condition => {
    let score = condition.baseProb * 0.3; // Base probability
    let matchCount = 0;
    
    condition.keywords.forEach(keyword => {
      if (symptomText.includes(keyword.toLowerCase())) {
        matchCount++;
        score += 0.15; // Add points for each keyword match
      }
    });
    
    // Add some randomness to make it more realistic
    score += (Math.random() - 0.5) * 0.2;
    
    // Ensure probability is between 0 and 1
    score = Math.min(Math.max(score, 0.1), 0.95);
    
    return {
      condition: condition.name,
      probability: parseFloat(score.toFixed(2)),
      explanation: generateExplanation(condition.name, matchCount, symptoms)
    };
  });

  // Sort by probability and return top 3
  return scoredConditions
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);
}

function generateExplanation(condition: string, matchCount: number, symptoms: string[]): string {
  const explanations = {
    "Malaria": "Symptoms align with malaria, especially fever and associated symptoms.",
    "Typhoid": "Possible due to fever and systemic symptoms presentation.",
    "Common Cold": "Overlap of respiratory and mild systemic symptoms.",
    "Flu": "Systemic symptoms suggest possible influenza infection.",
    "Gastroenteritis": "Gastrointestinal symptoms indicate possible stomach infection.",
    "Migraine": "Headache pattern and associated symptoms suggest migraine.",
    "Hypertension": "Symptoms may be related to elevated blood pressure."
  };

  let explanation = explanations[condition] || `Symptoms partially match ${condition} pattern.`;
  
  if (matchCount > 2) {
    explanation += " Strong symptom correlation detected.";
  } else if (matchCount > 0) {
    explanation += " Some relevant symptoms present.";
  } else {
    explanation += " Based on general symptom presentation.";
  }
  
  return explanation;
}