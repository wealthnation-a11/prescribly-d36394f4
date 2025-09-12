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

    // Input validation - allow both array and free text
    let processedSymptoms = [];
    if (typeof symptoms === 'string') {
      processedSymptoms = [symptoms];
    } else if (Array.isArray(symptoms)) {
      processedSymptoms = symptoms;
    } else {
      return new Response(
        JSON.stringify({ error: 'Symptoms must be an array of strings or free text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (processedSymptoms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Symptoms cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize symptoms
    const sanitizedSymptoms = processedSymptoms
      .slice(0, 10)
      .map(symptom => String(symptom).trim().toLowerCase().substring(0, 300))
      .filter(symptom => symptom.length > 0);

    console.log('Processing symptoms:', sanitizedSymptoms);

    // Check for emergency symptoms
    const emergencyKeywords = ['chest pain', 'shortness of breath'];
    const symptomText = sanitizedSymptoms.join(' ');
    const hasEmergencySymptoms = emergencyKeywords.every(keyword => 
      symptomText.includes(keyword)
    );

    if (hasEmergencySymptoms) {
      return new Response(
        JSON.stringify({
          emergency: true,
          message: "Seek emergency care immediately"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all conditions from database
    const { data: conditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('id, name, description, common_symptoms');

    if (conditionsError) {
      console.error('Error fetching conditions:', conditionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conditions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate probabilities based on symptom matching
    const diagnosisResults = calculateDiagnosis(sanitizedSymptoms, conditions);

    // Create diagnosis session in v2 table
    const { data: sessionData, error: sessionError } = await supabase
      .from('diagnosis_sessions_v2')
      .insert({
        user_id: user.id,
        symptoms: sanitizedSymptoms,
        conditions: diagnosisResults,
        status: 'pending'
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

    console.log('Generated diagnosis results:', diagnosisResults);

    return new Response(
      JSON.stringify({
        diagnosis: diagnosisResults
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

function calculateDiagnosis(symptoms, conditions) {
  const symptomText = symptoms.join(' ');
  
  const scoredConditions = conditions.map(condition => {
    let matchedSymptoms = 0;
    let totalSymptoms = 0;
    
    // Extract symptoms from common_symptoms field or use fallback
    let conditionSymptoms = [];
    if (condition.common_symptoms && Array.isArray(condition.common_symptoms)) {
      conditionSymptoms = condition.common_symptoms.map(s => s.toLowerCase());
    } else if (condition.common_symptoms && typeof condition.common_symptoms === 'string') {
      conditionSymptoms = [condition.common_symptoms.toLowerCase()];
    } else {
      // Fallback keywords based on condition name
      const fallbackKeywords = getFallbackKeywords(condition.name);
      conditionSymptoms = fallbackKeywords;
    }
    
    totalSymptoms = conditionSymptoms.length;
    
    // Count matches
    conditionSymptoms.forEach(keyword => {
      if (symptomText.includes(keyword)) {
        matchedSymptoms++;
      }
    });
    
    // Calculate probability as percentage
    const probability = totalSymptoms > 0 ? Math.round((matchedSymptoms / totalSymptoms) * 100) : 0;
    
    return {
      conditionId: condition.id,
      name: condition.name,
      probability: probability,
      explanation: `Matched ${matchedSymptoms} of ${totalSymptoms} symptoms`,
      matchCount: matchedSymptoms,
      totalCount: totalSymptoms
    };
  });

  // Sort by probability and return top 3
  return scoredConditions
    .filter(condition => condition.probability > 0) // Only include conditions with matches
    .sort((a, b) => {
      // Sort by probability first, then by match count
      if (b.probability !== a.probability) {
        return b.probability - a.probability;
      }
      return b.matchCount - a.matchCount;
    })
    .slice(0, 3)
    .map(condition => ({
      conditionId: condition.conditionId,
      name: condition.name,
      probability: condition.probability,
      explanation: condition.explanation
    }));
}

function getFallbackKeywords(conditionName) {
  const fallbacks = {
    "Malaria": ["fever", "headache", "chills", "sweating", "nausea"],
    "Typhoid": ["fever", "headache", "weakness", "abdominal", "loss of appetite"],
    "Common Cold": ["cough", "runny nose", "sneezing", "sore throat", "congestion"],
    "Flu": ["fever", "body aches", "fatigue", "cough", "headache"],
    "Gastroenteritis": ["nausea", "vomiting", "diarrhea", "abdominal pain", "cramping"],
    "Migraine": ["headache", "nausea", "sensitivity to light", "visual disturbance"],
    "Hypertension": ["headache", "dizziness", "chest pain", "shortness of breath"],
    "Pneumonia": ["cough", "fever", "difficulty breathing", "chest pain"],
    "Bronchitis": ["cough", "mucus", "chest discomfort", "fatigue"],
    "Sinusitis": ["facial pain", "nasal congestion", "headache", "thick nasal discharge"]
  };
  
  return fallbacks[conditionName] || ["symptoms", "discomfort", "pain"];
}