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

// Mock condition database with Bayesian priors
const CONDITIONS_DB = [
  {
    id: 'c1',
    name: 'Common Cold',
    base_probability: 0.15, // 15% prevalence in general population
    symptoms: {
      'runny nose': 0.9,
      'sore throat': 0.8,
      'cough': 0.7,
      'mild fever': 0.6,
      'fatigue': 0.5,
      'headache': 0.4
    }
  },
  {
    id: 'c2',
    name: 'Seasonal Allergies',
    base_probability: 0.08,
    symptoms: {
      'runny nose': 0.95,
      'sneezing': 0.9,
      'itchy eyes': 0.85,
      'nasal congestion': 0.8,
      'watery eyes': 0.7,
      'throat irritation': 0.4
    }
  },
  {
    id: 'c3',
    name: 'Acute Sinusitis',
    base_probability: 0.05,
    symptoms: {
      'facial pressure': 0.9,
      'nasal congestion': 0.85,
      'thick nasal discharge': 0.8,
      'reduced smell': 0.7,
      'headache': 0.6,
      'tooth pain': 0.4
    }
  },
  {
    id: 'c4',
    name: 'Migraine',
    base_probability: 0.12,
    symptoms: {
      'severe headache': 0.95,
      'nausea': 0.8,
      'light sensitivity': 0.75,
      'sound sensitivity': 0.7,
      'visual aura': 0.3
    }
  },
  {
    id: 'c5',
    name: 'Tension Headache',
    base_probability: 0.20,
    symptoms: {
      'headache': 0.9,
      'neck tension': 0.7,
      'scalp tenderness': 0.5,
      'fatigue': 0.4
    }
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

    // Run Bayesian inference
    const diagnoses = runBayesianInference(normalizedSymptoms, demographicInfo);
    
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
      total_conditions_evaluated: CONDITIONS_DB.length
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

// Simple Bayesian inference implementation
function runBayesianInference(symptoms, demographicInfo) {
  const results = [];
  
  for (const condition of CONDITIONS_DB) {
    // Calculate likelihood P(symptoms|condition)
    let likelihood = 1.0;
    let evidenceCount = 0;
    
    for (const symptom of symptoms) {
      // Find matching symptom in condition's symptom profile
      const matchingSymptom = Object.keys(condition.symptoms).find(condSymptom =>
        symptom.includes(condSymptom) || condSymptom.includes(symptom)
      );
      
      if (matchingSymptom) {
        likelihood *= condition.symptoms[matchingSymptom];
        evidenceCount++;
      } else {
        // Penalty for symptoms not associated with condition
        likelihood *= 0.1;
      }
    }
    
    // Apply demographic adjustments (simplified)
    let priorProbability = condition.base_probability;
    if (demographicInfo?.age) {
      // Age-based adjustments (simplified)
      if (condition.name === 'Migraine' && demographicInfo.age > 20 && demographicInfo.age < 50) {
        priorProbability *= 1.5; // Higher prevalence in this age group
      }
      if (condition.name === 'Common Cold' && demographicInfo.age < 10) {
        priorProbability *= 2.0; // Higher in children
      }
    }
    
    // Bayesian calculation: P(condition|symptoms) ∝ P(symptoms|condition) * P(condition)
    const posteriorProbability = likelihood * priorProbability;
    
    results.push({
      ...condition,
      probability: posteriorProbability,
      evidence_count: evidenceCount,
      likelihood: likelihood
    });
  }
  
  // Normalize probabilities
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
  const matchingSymptoms = symptoms.filter(symptom =>
    Object.keys(diagnosis.symptoms).some(condSymptom =>
      symptom.includes(condSymptom) || condSymptom.includes(symptom)
    )
  );
  
  if (matchingSymptoms.length === 0) {
    return `Based on general symptom patterns, ${diagnosis.name} is being considered.`;
  }
  
  const symptomList = matchingSymptoms.slice(0, 3).join(', ');
  return `Based on symptoms including ${symptomList}, this suggests ${diagnosis.name}. The probability is calculated using symptom matching and population prevalence data.`;
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