import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Load conditions dataset
import conditionsData from './conditions.json' assert { type: 'json' };

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

    // Perform diagnosis using the new scoring algorithm
    const diagnosis = performDiagnosis(symptoms, answers || []);

    if (!diagnosis) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No matching diagnosis could be made. Please consult a doctor.' 
      }), {
        status: 200,
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

function performDiagnosis(symptoms: string[], answers: string[]) {
  console.log('Loaded conditions:', conditionsData.length);
  
  // Normalize user input
  const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim());
  const normalizedAnswers = answers.map(a => a.toLowerCase().trim());
  
  // Combine symptoms and answers for comprehensive matching
  const allUserInput = [...normalizedSymptoms, ...normalizedAnswers];
  
  console.log('User input for matching:', allUserInput);

  // Calculate match scores for each condition
  const conditionScores = conditionsData.map(condition => {
    const conditionSymptoms = condition.symptoms.map(s => s.toLowerCase());
    let matchingSymptoms = 0;
    
    // Count overlapping symptoms
    conditionSymptoms.forEach(condSymptom => {
      const hasMatch = allUserInput.some(userInput => {
        // Check for exact matches or partial matches
        return userInput.includes(condSymptom) || condSymptom.includes(userInput);
      });
      
      if (hasMatch) {
        matchingSymptoms++;
      }
    });
    
    // Calculate match score = (overlapping symptoms) / (total symptoms for condition)
    const matchScore = conditionSymptoms.length > 0 ? matchingSymptoms / conditionSymptoms.length : 0;
    
    console.log(`${condition.name}: ${matchingSymptoms}/${conditionSymptoms.length} = ${matchScore.toFixed(2)}`);
    
    return {
      condition: condition.name,
      score: matchScore,
      matchingSymptoms,
      totalSymptoms: conditionSymptoms.length,
      recommendations: condition.recommendations
    };
  });

  // Sort by score and get the best match
  conditionScores.sort((a, b) => b.score - a.score);
  const bestMatch = conditionScores[0];
  
  console.log('Best match:', bestMatch);

  // Return null if no reasonable match found
  if (!bestMatch || bestMatch.score === 0) {
    return null;
  }

  // Generate explanation
  const explanation = generateExplanation(bestMatch, normalizedSymptoms);

  return {
    condition: bestMatch.condition,
    probability: bestMatch.score, // Use match score as probability
    explanation: explanation,
    recommendations: bestMatch.recommendations
  };
}

function generateExplanation(bestMatch: any, symptoms: string[]): string {
  const conditionName = bestMatch.condition;
  const probability = Math.round(bestMatch.score * 100);
  const matchingCount = bestMatch.matchingSymptoms;
  const totalCount = bestMatch.totalSymptoms;
  
  let explanation = `Based on your reported symptoms including ${symptoms.slice(0, 3).join(', ')}, `;
  explanation += `${conditionName} appears to be the most likely condition with ${probability}% probability. `;
  
  explanation += `This diagnosis matches ${matchingCount} out of ${totalCount} key symptoms for this condition. `;
  
  if (probability >= 80) {
    explanation += "The high probability indicates a strong symptom match, but professional medical confirmation is essential for proper treatment.";
  } else if (probability >= 60) {
    explanation += "While this is a probable diagnosis, other conditions should also be considered by a healthcare professional.";
  } else if (probability >= 40) {
    explanation += "This condition shows moderate symptom alignment. A healthcare provider can help determine the most accurate diagnosis.";
  } else {
    explanation += "This diagnosis shows some symptom overlap but may require additional evaluation by a healthcare professional.";
  }
  
  return explanation;
}