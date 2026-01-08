import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const healthCompanionSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
  sessionId: z.string().uuid("Invalid session ID").optional().nullable(),
  userId: z.string().uuid("Invalid user ID").optional().nullable(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(5000)
  })).max(50, "Conversation history too long").default([]),
  currentSymptoms: z.array(z.string().max(200)).max(30, "Too many symptoms").default([])
});

// Bayesian inference for symptom-condition matching
function calculateProbabilities(symptoms: string[], conditions: any[]) {
  return conditions.map(condition => {
    const conditionSymptoms = condition.symptoms || {};
    let totalProbability = 0;
    let matchingSymptoms = 0;

    symptoms.forEach(symptom => {
      const symptomKey = symptom.toLowerCase().replace(/\s+/g, '_');
      if (conditionSymptoms[symptomKey]) {
        matchingSymptoms++;
        // Use symptom frequency and condition base rate for Bayesian calculation
        const symptomFreq = conditionSymptoms[symptomKey] || 0.1;
        const baseRate = (condition.total_case_count || 100) / 10000; // normalize
        totalProbability += symptomFreq * baseRate;
      }
    });

    const confidence = matchingSymptoms > 0 ? 
      Math.min(0.95, totalProbability * (matchingSymptoms / symptoms.length)) : 0;

    return {
      condition: condition.name,
      probability: Math.round(confidence * 100),
      drugs: condition.drug_recommendations || [],
      matchingSymptoms
    };
  }).sort((a, b) => b.probability - a.probability);
}

// Generate next question based on conversation history
async function generateNextQuestion(conversationHistory: any[], currentSymptoms: string[]) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `You are a medical AI assistant conducting a diagnostic interview. 
Based on the conversation history and current symptoms, ask ONE specific follow-up question to narrow down the diagnosis.

Current symptoms: ${currentSymptoms.join(', ')}

Conversation so far:
${conversationHistory.map(h => `${h.role}: ${h.content}`).join('\n')}

Ask a specific, medical question that helps differentiate between possible conditions. Keep it under 50 words.
Focus on: timing, severity, triggers, associated symptoms, or patient history.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input using Zod
    const validation = healthCompanionSchema.safeParse(body);
    if (!validation.success) {
      console.log('Validation failed:', validation.error.issues);
      return new Response(JSON.stringify({ 
        error: 'Validation failed',
        details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      message, 
      sessionId, 
      userId,
      conversationHistory,
      currentSymptoms
    } = validation.data;

    console.log('AI Health Companion request:', { message: message.substring(0, 100), sessionId, userId });

    // Extract symptoms from user message using simple keyword matching
    const extractedSymptoms = message.toLowerCase().match(
      /\b(headache|fever|cough|nausea|pain|tired|dizzy|sore|ache|swelling|rash|itching|bleeding|shortness|breath|chest|stomach|back|joint|muscle|throat|runny|nose|congestion|diarrhea|constipation|vomiting|fatigue|weakness|numbness|tingling)\b/g
    ) || [];

    const allSymptoms = [...new Set([...currentSymptoms, ...extractedSymptoms])];

    // Get conditions from database
    const { data: conditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('*')
      .limit(50);

    if (conditionsError) {
      throw conditionsError;
    }

    // Calculate probabilities using Bayesian inference
    const probabilities = calculateProbabilities(allSymptoms, conditions);
    const topCondition = probabilities[0];

    console.log('Top condition probability:', topCondition?.probability);

    // Check if confidence threshold is met (80%)
    if (topCondition && topCondition.probability >= 80) {
      // Diagnosis complete - award points and save session
      const diagnosisResult = {
        condition: topCondition.condition,
        probability: topCondition.probability,
        drugs: topCondition.drugs.slice(0, 3) // Limit to top 3 drugs
      };

      // Update chat session with diagnosis
      if (sessionId) {
        await supabase
          .from('chat_sessions')
          .update({
            diagnosis_result: diagnosisResult,
            confidence_score: topCondition.probability / 100,
            status: 'completed',
            points_earned: 10,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        // Award points to user
        if (userId) {
          await supabase.rpc('update_user_points', {
            user_uuid: userId,
            points_to_add: 10
          });
        }
      }

      return new Response(JSON.stringify({
        response: `🎉 Diagnosis complete! You've earned 10 points!\n\n🩺 **Condition:** ${diagnosisResult.condition}\n**Confidence:** ${diagnosisResult.probability}%\n\n💊 **Recommended Treatment:**\n${diagnosisResult.drugs.map((drug: any) => `• **${drug.name}** - ${drug.dosage}\n  ${drug.usage || 'As directed by physician'}`).join('\n\n')}\n\n⚠️ **Important:** This is AI-generated guidance. Always consult a licensed medical professional before taking any medication.`,
        diagnosis: diagnosisResult,
        symptoms: allSymptoms,
        isComplete: true,
        pointsEarned: 10
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate next question
    const nextQuestion = await generateNextQuestion([
      ...conversationHistory,
      { role: 'user', content: message }
    ], allSymptoms);

    // Update session with current state
    if (sessionId) {
      await supabase
        .from('chat_sessions')
        .update({
          current_question: nextQuestion,
          conversation_history: [
            ...conversationHistory,
            { role: 'user', content: message },
            { role: 'assistant', content: nextQuestion }
          ],
          session_data: { symptoms: allSymptoms, probabilities: probabilities.slice(0, 3) },
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    return new Response(JSON.stringify({
      response: nextQuestion,
      symptoms: allSymptoms,
      topConditions: probabilities.slice(0, 3),
      isComplete: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in AI Health Companion:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});