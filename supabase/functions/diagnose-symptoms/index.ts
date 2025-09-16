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

    const { symptoms, demographicInfo, answers, user_id, session_id } = await req.json();
    
    console.log('Processing diagnosis request:', { symptoms, demographicInfo, answers, user_id, session_id });

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
    const diagnoses = runDiagnosisMatching(normalizedSymptoms, dbConditions || [], demographicInfo, answers);
    
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
      session_id: session_id || crypto.randomUUID(),
      processed_at: new Date().toISOString(),
      input_symptoms: normalizedSymptoms,
      answers: answers,
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
    
    // Enhanced symptom keywords covering all 20 conditions
    const symptomKeywords = [
      // General symptoms
      'headache', 'fever', 'cough', 'sore throat', 'runny nose', 'congestion',
      'nausea', 'vomiting', 'diarrhea', 'fatigue', 'dizziness', 'chest pain',
      'shortness of breath', 'abdominal pain', 'back pain', 'muscle aches',
      'sneezing', 'itchy eyes', 'watery eyes', 'facial pressure', 'neck stiffness',
      'vision changes', 'light sensitivity', 'sound sensitivity',
      
      // Specific symptoms for our conditions
      'weakness', 'pale skin', 'cold hands', 'cold feet', 'joint pain', 'stiffness',
      'swelling', 'wheezing', 'chest tightness', 'difficulty breathing', 'red eyes',
      'discharge from eyes', 'burning sensation', 'body aches', 'loss of taste', 
      'loss of smell', 'persistent sadness', 'loss of interest', 'sleep problems',
      'appetite changes', 'difficulty concentrating', 'itchy skin', 'red skin',
      'dry skin', 'rash', 'increased thirst', 'frequent urination', 'hunger',
      'blurred vision', 'slow healing wounds', 'dark urine', 'pale stools',
      'jaundice', 'weight loss', 'night sweats', 'chills', 'throbbing pain',
      'ear pain', 'hearing problems', 'ear discharge', 'irritability',
      'difficulty sleeping', 'stomach pain', 'bloating', 'heartburn',
      'sudden weakness', 'speech problems', 'loss of coordination',
      'persistent cough', 'coughing up blood', 'high fever', 'constipation',
      'loss of appetite', 'burning urination', 'cloudy urine', 'strong urine odor',
      'pelvic pain', 'muscle pain', 'tenderness', 'warmth around joints',
      'reduced range of motion', 'opportunistic infections'
    ];
    
    // Check for symptom matches with fuzzy matching
    symptomKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        normalizedSymptoms.push(keyword);
      }
    });
    
    // Check for common phrase variations
    if (text.includes('head hurt') || text.includes('head ache')) {
      normalizedSymptoms.push('headache');
    }
    if (text.includes('feel sick') || text.includes('feel nauseous')) {
      normalizedSymptoms.push('nausea');
    }
    if (text.includes('throw up') || text.includes('throwing up')) {
      normalizedSymptoms.push('vomiting');
    }
    if (text.includes('can\'t breathe') || text.includes('hard to breathe')) {
      normalizedSymptoms.push('shortness of breath');
    }
    if (text.includes('belly pain') || text.includes('tummy ache')) {
      normalizedSymptoms.push('stomach pain');
    }
    
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
function runDiagnosisMatching(symptoms, dbConditions, demographicInfo, answers = {}) {
  const results = [];
  
  for (const condition of dbConditions) {
    // Parse common symptoms from the condition (stored as JSONB)
    let conditionSymptoms = [];
    try {
      conditionSymptoms = condition.common_symptoms ? JSON.parse(condition.common_symptoms) : [];
    } catch (e) {
      conditionSymptoms = condition.common_symptoms || [];
    }
    
    // Calculate match score based on symptom overlap
    let matchScore = 0;
    let exactMatches = 0;
    let partialMatches = 0;
    
    for (const symptom of symptoms) {
      // Check for exact matches first
      const exactMatch = conditionSymptoms.some(condSymptom => 
        symptom.toLowerCase() === condSymptom.toLowerCase()
      );
      
      if (exactMatch) {
        exactMatches += 1;
        matchScore += 2; // Higher weight for exact matches
      } else {
        // Check for partial matches
        const partialMatch = conditionSymptoms.some(condSymptom => 
          symptom.toLowerCase().includes(condSymptom.toLowerCase()) ||
          condSymptom.toLowerCase().includes(symptom.toLowerCase()) ||
          isSymptomRelated(symptom.toLowerCase(), condSymptom.toLowerCase())
        );
        
        if (partialMatch) {
          partialMatches += 1;
          matchScore += 1; // Lower weight for partial matches
        }
      }
    }
    
    // Calculate base probability with improved scoring
    let probability = 0;
    
    if (matchScore > 0) {
      // Base probability calculation
      const maxPossibleScore = Math.max(symptoms.length * 2, conditionSymptoms.length * 2);
      probability = (matchScore / maxPossibleScore) * 0.8;
      
      // Bonus for multiple matches
      if (exactMatches > 1) {
        probability += 0.15;
      }
      
      // Add base prevalence based on condition commonality
      const prevalenceBonus = getConditionPrevalence(condition.name);
      probability += prevalenceBonus;
      
      // Ensure reasonable minimum probability for matches
      if (probability < 0.15) {
        probability = 0.15;
      }
    } else {
      // Small chance for common conditions even without direct symptom matches
      probability = getConditionPrevalence(condition.name) * 0.3;
    }
    
    // Apply demographic adjustments and answer-based adjustments
    probability = applyDemographicAdjustments(probability, condition.name, demographicInfo);
    probability = applyAnswerAdjustments(probability, condition.name, answers);
    
    results.push({
      id: condition.id,
      name: condition.name,
      description: condition.description,
      probability: Math.min(probability, 0.95), // Cap at 95%
      match_score: matchScore,
      exact_matches: exactMatches,
      partial_matches: partialMatches,
      severity_level: condition.severity_level
    });
  }
  
  // Sort by probability and normalize top candidates
  results.sort((a, b) => b.probability - a.probability);
  
  // Enhanced normalization: ensure top 3 have meaningful probabilities
  const topResults = results.slice(0, 8); // Consider top 8 for normalization
  const totalTopProbability = topResults.reduce((sum, result) => sum + result.probability, 0);
  
  if (totalTopProbability > 0) {
    topResults.forEach(result => {
      result.probability = (result.probability / totalTopProbability) * 0.9; // Scale to 90% total
    });
  }
  
  return results;
}

// Generate explanation for diagnosis
function generateExplanation(diagnosis, symptoms) {
  const matchingCount = diagnosis.match_score || 0;
  const exactMatches = diagnosis.exact_matches || 0;
  const partialMatches = diagnosis.partial_matches || 0;
  
  if (matchingCount === 0) {
    return `${diagnosis.name} is being considered based on general prevalence patterns and demographic factors.`;
  }
  
  let explanation = `Based on your symptoms`;
  
  if (exactMatches > 0) {
    explanation += ` with ${exactMatches} direct match${exactMatches > 1 ? 'es' : ''}`;
    if (partialMatches > 0) {
      explanation += ` and ${partialMatches} related symptom${partialMatches > 1 ? 's' : ''}`;
    }
  } else if (partialMatches > 0) {
    explanation += ` with ${partialMatches} related symptom${partialMatches > 1 ? 's' : ''}`;
  }
  
  explanation += `, ${diagnosis.name} is a possible condition.`;
  
  // Add confidence indicator
  if (diagnosis.probability > 0.6) {
    explanation += ' This shows strong symptom alignment.';
  } else if (diagnosis.probability > 0.3) {
    explanation += ' This shows moderate symptom alignment.';
  } else {
    explanation += ' Additional evaluation may be needed.';
  }
  
  return explanation;
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

// Check if symptoms are related (semantic matching)
function isSymptomRelated(symptom1, symptom2) {
  const synonyms = {
    'headache': ['head pain', 'migraine', 'cephalgia'],
    'fever': ['high temperature', 'pyrexia', 'hot'],
    'fatigue': ['tiredness', 'exhaustion', 'weakness'],
    'cough': ['coughing', 'hack'],
    'pain': ['ache', 'hurt', 'discomfort', 'sore'],
    'shortness of breath': ['breathlessness', 'dyspnea', 'difficulty breathing'],
    'nausea': ['sick feeling', 'queasiness'],
    'vomiting': ['throwing up', 'emesis'],
    'diarrhea': ['loose stools', 'runny stool'],
    'chest pain': ['chest discomfort', 'chest ache'],
    'stomach pain': ['abdominal pain', 'belly pain', 'tummy ache'],
    'sore throat': ['throat pain', 'pharyngitis']
  };
  
  // Check direct synonyms
  for (const [key, values] of Object.entries(synonyms)) {
    if ((symptom1.includes(key) && values.some(v => symptom2.includes(v))) ||
        (symptom2.includes(key) && values.some(v => symptom1.includes(v)))) {
      return true;
    }
  }
  
  return false;
}

// Get base prevalence for different conditions
function getConditionPrevalence(conditionName) {
  const prevalence = {
    'COVID-19': 0.08,
    'Migraine': 0.12,
    'Hypertension': 0.10,
    'Diabetes Mellitus Type 2': 0.08,
    'Asthma': 0.07,
    'Depression': 0.06,
    'Arthritis': 0.05,
    'Urinary Tract Infection': 0.05,
    'Pneumonia': 0.04,
    'Dermatitis': 0.04,
    'Conjunctivitis': 0.03,
    'Otitis Media': 0.03,
    'Peptic Ulcer': 0.03,
    'Anemia': 0.02,
    'Malaria': 0.02,
    'Typhoid Fever': 0.02,
    'Tuberculosis': 0.01,
    'Hepatitis B': 0.01,
    'HIV/AIDS': 0.01,
    'Stroke': 0.01
  };
  
  return prevalence[conditionName] || 0.02;
}

// Apply demographic adjustments to probability
function applyDemographicAdjustments(probability, conditionName, demographicInfo) {
  let adjustedProbability = probability;
  
  if (demographicInfo?.age) {
    const age = demographicInfo.age;
    
    // Age-based adjustments
    if (conditionName === 'Migraine' && age >= 20 && age <= 50) {
      adjustedProbability *= 1.4;
    } else if (conditionName === 'Stroke' && age > 65) {
      adjustedProbability *= 1.6;
    } else if (conditionName === 'Otitis Media' && age < 10) {
      adjustedProbability *= 1.5;
    } else if (conditionName === 'Arthritis' && age > 50) {
      adjustedProbability *= 1.3;
    } else if (conditionName === 'Hypertension' && age > 40) {
      adjustedProbability *= 1.2;
    } else if (conditionName === 'Diabetes Mellitus Type 2' && age > 35) {
      adjustedProbability *= 1.2;
    }
  }
  
  if (demographicInfo?.gender) {
    const gender = demographicInfo.gender.toLowerCase();
    
    // Gender-based adjustments
    if (conditionName === 'Migraine' && gender === 'female') {
      adjustedProbability *= 1.3;
    } else if (conditionName === 'Urinary Tract Infection' && gender === 'female') {
      adjustedProbability *= 1.4;
    } else if (conditionName === 'Stroke' && gender === 'male') {
      adjustedProbability *= 1.1;
    }
  }
  
  return Math.min(adjustedProbability, 0.98);
}

// Apply adjustments based on clarifying question answers
function applyAnswerAdjustments(probability, conditionName, answers) {
  if (!answers || Object.keys(answers).length === 0) {
    return probability;
  }
  
  let adjustedProbability = probability;
  
  // Duration-based adjustments
  const duration = Object.values(answers).find(answer => 
    answer && (answer.includes('day') || answer.includes('week') || answer.includes('sudden'))
  );
  
  if (duration) {
    if (duration.includes('sudden') || duration.includes('Less than 1 day')) {
      // Acute conditions more likely
      if (['COVID-19', 'Migraine', 'Stroke', 'Pneumonia'].includes(conditionName)) {
        adjustedProbability *= 1.3;
      }
    } else if (duration.includes('More than 2 weeks')) {
      // Chronic conditions more likely
      if (['Diabetes Mellitus Type 2', 'Hypertension', 'Arthritis', 'Depression'].includes(conditionName)) {
        adjustedProbability *= 1.4;
      }
    }
  }
  
  // Severity-based adjustments
  const severity = Object.values(answers).find(answer => 
    answer && (answer.includes('Severe') || answer.includes('Mild'))
  );
  
  if (severity) {
    if (severity.includes('Very Severe') || severity.includes('9-10')) {
      // High severity conditions
      if (['Migraine', 'Stroke', 'Pneumonia', 'COVID-19'].includes(conditionName)) {
        adjustedProbability *= 1.5;
      }
    } else if (severity.includes('Mild')) {
      // Mild conditions
      if (['Conjunctivitis', 'Dermatitis', 'Otitis Media'].includes(conditionName)) {
        adjustedProbability *= 1.2;
      }
    }
  }
  
  // Trigger-based adjustments
  const triggers = Object.values(answers).find(answer => 
    answer && (answer.includes('stress') || answer.includes('activity') || answer.includes('food'))
  );
  
  if (triggers) {
    if (triggers.toLowerCase().includes('stress')) {
      if (['Migraine', 'Depression', 'Hypertension'].includes(conditionName)) {
        adjustedProbability *= 1.3;
      }
    } else if (triggers.toLowerCase().includes('activity')) {
      if (['Asthma', 'Arthritis', 'Hypertension'].includes(conditionName)) {
        adjustedProbability *= 1.2;
      }
    }
  }
  
  return Math.min(adjustedProbability, 0.98);
}