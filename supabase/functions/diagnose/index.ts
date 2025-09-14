import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the auth header
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { symptoms, answers, session_id } = await req.json();

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return new Response(JSON.stringify({ error: 'Symptoms are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing diagnosis for symptoms:', symptoms, 'with answers:', answers);

    // Update questions with answers if session_id provided
    if (session_id && answers && Array.isArray(answers)) {
      const { data: questions } = await supabaseClient
        .from('assessment_questions')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at');

      if (questions && questions.length > 0) {
        for (let i = 0; i < Math.min(questions.length, answers.length); i++) {
          await supabaseClient
            .from('assessment_questions')
            .update({ user_answer: answers[i] })
            .eq('id', questions[i].id);
        }
      }
    }

    // Get all conditions from database
    const { data: conditions, error: conditionsError } = await supabaseClient
      .from('conditions')
      .select('*');

    if (conditionsError) {
      console.error('Error fetching conditions:', conditionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch conditions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Diagnose and find the best matching condition
    const diagnosis = performDiagnosis(symptoms, answers || [], conditions || []);

    if (!diagnosis) {
      return new Response(JSON.stringify({ error: 'No diagnosis could be determined' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save diagnosis result
    const finalSessionId = session_id || crypto.randomUUID();
    const { error: saveError } = await supabaseClient
      .from('diagnosis_results')
      .insert({
        session_id: finalSessionId,
        symptoms: symptoms,
        answers: answers || [],
        condition: diagnosis.condition,
        probability: diagnosis.probability,
        explanation: diagnosis.explanation,
        recommendations: diagnosis.recommendations
      });

    if (saveError) {
      console.error('Error saving diagnosis:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      session_id: finalSessionId,
      condition: diagnosis.condition,
      probability: diagnosis.probability,
      explanation: diagnosis.explanation,
      recommendations: diagnosis.recommendations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in diagnose function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function performDiagnosis(symptoms: string[], answers: string[], conditions: any[]) {
  if (!conditions || conditions.length === 0) {
    return null;
  }

  // Normalize symptoms
  const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim());
  const symptomText = normalizedSymptoms.join(' ');

  // Calculate scores for each condition
  const conditionScores = conditions.map(condition => {
    let score = 0;
    let matchCount = 0;

    if (condition.common_symptoms) {
      const conditionSymptoms = Array.isArray(condition.common_symptoms) 
        ? condition.common_symptoms 
        : condition.common_symptoms.symptoms || [];

      for (const condSymptom of conditionSymptoms) {
        const normalizedCondSymptom = condSymptom.toLowerCase();
        
        // Check for exact matches
        if (normalizedSymptoms.some(s => s.includes(normalizedCondSymptom) || normalizedCondSymptom.includes(s))) {
          score += 10;
          matchCount++;
        }
        
        // Check for partial matches in the combined symptom text
        if (symptomText.includes(normalizedCondSymptom)) {
          score += 5;
        }
      }
    }

    // Boost score based on answers indicating severity
    if (answers && answers.length > 0) {
      answers.forEach(answer => {
        const lowerAnswer = answer.toLowerCase();
        if (lowerAnswer.includes('severe') || lowerAnswer.includes('very')) {
          score += 3;
        } else if (lowerAnswer.includes('moderate')) {
          score += 2;
        } else if (lowerAnswer.includes('mild')) {
          score += 1;
        }
      });
    }

    // Calculate probability (normalized to 0-1 range)
    const maxPossibleScore = condition.common_symptoms ? 
      (Array.isArray(condition.common_symptoms) ? condition.common_symptoms.length : condition.common_symptoms.symptoms?.length || 1) * 10 : 10;
    
    const probability = Math.min(score / Math.max(maxPossibleScore, 10), 1.0);

    return {
      condition: condition.name,
      description: condition.description,
      score,
      matchCount,
      probability: Math.max(probability, 0.1), // Minimum 10% probability
      severityLevel: condition.severity_level || 1
    };
  });

  // Sort by score and select the best match
  conditionScores.sort((a, b) => b.score - a.score);
  const bestMatch = conditionScores[0];

  if (!bestMatch || bestMatch.score === 0) {
    // Return a generic result if no good matches
    return {
      condition: "General Symptoms",
      probability: 0.3,
      explanation: "Based on the symptoms provided, multiple conditions are possible. A healthcare professional should evaluate these symptoms for an accurate diagnosis.",
      recommendations: [
        "Monitor symptoms closely",
        "Stay hydrated and get adequate rest",
        "Consult a healthcare provider if symptoms persist or worsen",
        "Keep a symptom diary to track changes"
      ]
    };
  }

  // Generate explanation
  const explanation = generateExplanation(bestMatch, normalizedSymptoms);
  
  // Generate recommendations
  const recommendations = generateRecommendations(bestMatch, normalizedSymptoms);

  return {
    condition: bestMatch.condition,
    probability: bestMatch.probability,
    explanation,
    recommendations
  };
}

function generateExplanation(diagnosis: any, symptoms: string[]): string {
  const conditionName = diagnosis.condition;
  const probability = Math.round(diagnosis.probability * 100);
  
  let explanation = `Based on the reported symptoms including ${symptoms.slice(0, 3).join(', ')}, `;
  explanation += `${conditionName} appears to be the most likely condition with ${probability}% probability. `;
  
  if (diagnosis.matchCount > 0) {
    explanation += `Several key symptoms align with this condition. `;
  }
  
  if (probability >= 80) {
    explanation += "The high probability suggests a strong symptom match, but medical confirmation is recommended.";
  } else if (probability >= 60) {
    explanation += "While this is a probable diagnosis, other conditions should also be considered.";
  } else {
    explanation += "This diagnosis is based on limited symptom matching. Professional medical evaluation is strongly advised.";
  }
  
  return explanation;
}

function generateRecommendations(diagnosis: any, symptoms: string[]): string[] {
  const recommendations = [];
  const conditionName = diagnosis.condition.toLowerCase();
  
  // General recommendations
  recommendations.push("Consult a healthcare provider for proper diagnosis and treatment");
  
  // Condition-specific recommendations
  if (conditionName.includes('fever') || conditionName.includes('malaria') || conditionName.includes('typhoid')) {
    recommendations.push("Stay hydrated and monitor temperature");
    recommendations.push("Get adequate rest");
    recommendations.push("Seek immediate medical attention if fever exceeds 39°C (102°F)");
  } else if (conditionName.includes('cough') || conditionName.includes('pneumonia') || conditionName.includes('asthma')) {
    recommendations.push("Avoid smoking and polluted environments");
    recommendations.push("Use a humidifier or breathe steam to ease breathing");
    recommendations.push("Monitor breathing difficulty closely");
  } else if (conditionName.includes('pain') || conditionName.includes('headache') || conditionName.includes('migraine')) {
    recommendations.push("Rest in a quiet, dark room");
    recommendations.push("Apply cold or warm compress as appropriate");
    recommendations.push("Keep a pain diary to track triggers");
  } else if (conditionName.includes('stomach') || conditionName.includes('digestive') || conditionName.includes('gastro')) {
    recommendations.push("Stay hydrated with clear fluids");
    recommendations.push("Follow a bland diet (BRAT: bananas, rice, applesauce, toast)");
    recommendations.push("Avoid dairy, caffeine, and fatty foods temporarily");
  }
  
  // High severity recommendations
  if (diagnosis.probability >= 0.8 || diagnosis.severityLevel >= 4) {
    recommendations.push("Seek immediate medical attention - this may require urgent care");
  }
  
  // General health recommendations
  recommendations.push("Monitor symptoms and seek help if they worsen");
  recommendations.push("Take prescribed medications as directed by a healthcare provider");
  
  return recommendations;
}