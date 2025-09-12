import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Emergency patterns for red-flag detection
const EMERGENCY_PATTERNS = [
  {
    symptoms: ['chest pain', 'shortness of breath'],
    message: 'EMERGENCY: Chest pain with breathing difficulty requires immediate medical attention. Call 911 or go to ER immediately.'
  },
  {
    symptoms: ['severe headache', 'neck stiffness', 'fever'],
    message: 'EMERGENCY: These symptoms may indicate meningitis. Seek immediate emergency care.'
  },
  {
    symptoms: ['sudden severe headache', 'vision changes'],
    message: 'EMERGENCY: Sudden severe headache with vision changes needs immediate evaluation. Go to ER now.'
  },
  {
    symptoms: ['difficulty breathing', 'wheezing', 'chest tightness'],
    message: 'URGENT: Severe breathing difficulty requires immediate medical attention.'
  },
  {
    symptoms: ['severe abdominal pain', 'vomiting blood'],
    message: 'EMERGENCY: These symptoms require immediate emergency care. Go to ER now.'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symptoms, demographicInfo } = await req.json();
    
    console.log('Processing diagnosis request:', { symptoms, demographicInfo });

    // Parse symptoms into normalized array
    const normalizedSymptoms = parseSymptoms(symptoms);
    console.log('Normalized symptoms:', normalizedSymptoms);

    // Check for emergency patterns first
    const emergencyAlert = checkEmergencyPatterns(normalizedSymptoms);
    if (emergencyAlert) {
      return new Response(
        JSON.stringify({
          success: true,
          emergency: true,
          alert_message: emergencyAlert,
          diagnoses: [],
          session_id: crypto.randomUUID(),
          processed_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all conditions from the database
    const { data: dbConditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('*');

    if (conditionsError) {
      console.error('Error fetching conditions:', conditionsError);
      throw new Error('Failed to fetch conditions from database');
    }

    console.log(`Found ${dbConditions?.length || 0} conditions in database`);

    // Run diagnosis matching against database conditions
    const diagnoses = runDiagnosisMatching(normalizedSymptoms, dbConditions || [], demographicInfo);
    
    // Get top 3 diagnoses
    const topDiagnoses = diagnoses
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3)
      .map(diagnosis => ({
        condition_id: diagnosis.id,
        condition_name: diagnosis.name,
        probability: Math.round(diagnosis.probability * 100) / 100,
        explanation: generateExplanation(diagnosis, normalizedSymptoms),
        severity: getSeverityLevel(diagnosis.probability),
        confidence: getConfidenceLevel(diagnosis.probability, normalizedSymptoms.length)
      }));

    const response = {
      success: true,
      emergency: false,
      diagnoses: topDiagnoses,
      session_id: crypto.randomUUID(),
      processed_at: new Date().toISOString(),
      input_symptoms: normalizedSymptoms,
      demographic_info: demographicInfo,
      total_conditions_evaluated: dbConditions?.length || 0
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in diagnose-symptoms:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        diagnoses: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Parse and normalize symptoms from free text and structured input
function parseSymptoms(symptoms) {
  const normalizedSymptoms = [];
  
  if (typeof symptoms === 'string') {
    // Parse free text symptoms
    const text = symptoms.toLowerCase();
    
    // Extract common symptoms using keyword matching
    const symptomKeywords = [
      'headache', 'fever', 'cough', 'sore throat', 'runny nose', 'congestion',
      'nausea', 'vomiting', 'diarrhea', 'fatigue', 'dizziness', 'chest pain',
      'shortness of breath', 'abdominal pain', 'back pain', 'muscle aches',
      'sneezing', 'itchy eyes', 'watery eyes', 'facial pressure', 'neck stiffness',
      'vision changes', 'light sensitivity', 'sound sensitivity'
    ];
    
    symptomKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        normalizedSymptoms.push(keyword);
      }
    });
  } else if (Array.isArray(symptoms)) {
    // Structured symptom list
    normalizedSymptoms.push(...symptoms.map(s => s.toLowerCase()));
  }
  
  return [...new Set(normalizedSymptoms)]; // Remove duplicates
}

// Check for emergency patterns
function checkEmergencyPatterns(symptoms) {
  for (const pattern of EMERGENCY_PATTERNS) {
    const matchCount = pattern.symptoms.filter(symptom => 
      symptoms.some(userSymptom => userSymptom.includes(symptom))
    ).length;
    
    if (matchCount >= Math.min(2, pattern.symptoms.length)) {
      return pattern.message;
    }
  }
  return null;
}

// Diagnosis matching against database conditions
function runDiagnosisMatching(symptoms, dbConditions, demographicInfo) {
  const results = [];
  
  for (const condition of dbConditions) {
    // Parse common symptoms from the condition (stored as JSONB)
    const conditionSymptoms = condition.common_symptoms || [];
    
    // Calculate match score based on symptom overlap
    let matchScore = 0;
    let totalPossibleMatches = Math.max(symptoms.length, 1);
    
    for (const symptom of symptoms) {
      // Check if symptom matches any in the condition's symptom list
      const hasMatch = conditionSymptoms.some(condSymptom => 
        symptom.toLowerCase().includes(condSymptom.toLowerCase()) ||
        condSymptom.toLowerCase().includes(symptom.toLowerCase())
      );
      
      if (hasMatch) {
        matchScore += 1;
      }
    }
    
    // Calculate base probability based on match ratio and severity
    let probability = (matchScore / totalPossibleMatches) * 0.7; // Base match score
    
    // Add base prevalence factor
    const severityBonus = (condition.severity_level || 1) * 0.05;
    probability += severityBonus;
    
    // Ensure minimum probability for any condition with at least one match
    if (matchScore > 0 && probability < 0.1) {
      probability = 0.1;
    }
    
    // Apply demographic adjustments
    if (demographicInfo?.age) {
      // Simple age-based adjustments
      if (condition.name.toLowerCase().includes('migraine') && 
          demographicInfo.age >= 20 && demographicInfo.age <= 50) {
        probability *= 1.3;
      }
      if (condition.name.toLowerCase().includes('cold') && demographicInfo.age < 18) {
        probability *= 1.2;
      }
    }
    
    results.push({
      id: condition.id,
      name: condition.name,
      description: condition.description,
      probability: Math.min(probability, 1.0), // Cap at 1.0
      match_score: matchScore,
      severity_level: condition.severity_level
    });
  }
  
  // Normalize probabilities so they sum to 1
  const totalProbability = results.reduce((sum, result) => sum + result.probability, 0);
  if (totalProbability > 0) {
    results.forEach(result => {
      result.probability = result.probability / totalProbability;
    });
  }
  
  return results;
}

// Generate explanation for diagnosis
function generateExplanation(diagnosis, symptoms) {
  const matchingCount = diagnosis.match_score || 0;
  
  if (matchingCount === 0) {
    return `Based on general symptom patterns, ${diagnosis.name} is being considered.`;
  }
  
  return `Based on symptoms including ${symptoms.slice(0, 3).join(', ')}, this suggests ${diagnosis.name}. The probability is calculated using symptom matching and population prevalence data.`;
}

// Determine severity level
function getSeverityLevel(probability) {
  if (probability > 0.7) return 'high';
  if (probability > 0.4) return 'moderate';
  return 'low';
}

// Determine confidence level
function getConfidenceLevel(probability, symptomCount) {
  const baseConfidence = probability;
  const symptomBonus = Math.min(symptomCount * 0.1, 0.3);
  const confidence = baseConfidence + symptomBonus;
  
  if (confidence > 0.8) return 'high';
  if (confidence > 0.5) return 'moderate';
  return 'low';
}