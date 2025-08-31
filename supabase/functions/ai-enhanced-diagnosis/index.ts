import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosisRequest {
  symptoms: string;
  userId?: string;
  age?: number;
  gender?: string;
  additionalContext?: string;
}

interface DiagnosisResult {
  status: 'success' | 'guided' | 'error';
  diagnosis?: {
    condition: string;
    confidence: number;
    prescription: Array<{
      drug: string;
      dosage: string;
      notes?: string;
    }>;
  };
  question?: string;
  matches?: any[];
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { symptoms, userId, age, gender, additionalContext }: DiagnosisRequest = await req.json();
    
    if (!symptoms || typeof symptoms !== 'string') {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Symptoms are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing diagnosis for symptoms:', symptoms);

    // 1. Parse symptoms using existing function
    const { data: parsedSymptoms, error: parseError } = await supabase.functions.invoke('parse-symptoms', {
      body: { text: symptoms, locale: 'en' }
    });

    if (parseError) {
      console.error('Error parsing symptoms:', parseError);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to parse symptoms' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const symptomIds = parsedSymptoms.symptoms?.map((s: any) => s.id) || [];
    
    // 2. Get Bayesian diagnosis
    const { data: diagnosisData, error: diagnosisError } = await supabase.functions.invoke('diagnose', {
      body: { symptomIds, age, gender }
    });

    if (diagnosisError) {
      console.error('Error getting diagnosis:', diagnosisError);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to get diagnosis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const topConditions = diagnosisData.top || [];
    const topCondition = topConditions[0];

    if (!topCondition || topCondition.probability < 60) {
      // Need more information - trigger guided questioning
      const { data: questions } = await supabase
        .from('diagnostic_questions')
        .select('question_text')
        .limit(1);

      return new Response(
        JSON.stringify({
          status: 'guided',
          question: questions?.[0]?.question_text || 'Can you describe your symptoms in more detail?',
          matches: topConditions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get drug recommendation
    const { data: drugRec, error: drugError } = await supabase.functions.invoke('recommend-drug', {
      body: { condition_id: topCondition.condition_id }
    });

    if (drugError) {
      console.error('Error getting drug recommendation:', drugError);
    }

    // 4. AI validation and enhancement
    const aiPrompt = `You are Prescribly's AI Diagnostic Assistant. Analyze this medical case:

User symptoms: ${symptoms}
${additionalContext ? `Additional context: ${additionalContext}` : ''}
${age ? `Age: ${age}` : ''}
${gender ? `Gender: ${gender}` : ''}

Top diagnosis: ${topCondition.name} (${topCondition.probability.toFixed(1)}% confidence)
Description: ${topCondition.description}
${drugRec ? `Recommended drug: ${drugRec.drug_name} - ${drugRec.dosage}` : ''}

Validate this diagnosis and provide a refined assessment. Return ONLY valid JSON:
{
  "condition": "<validated condition name>",
  "confidence": <confidence percentage as number>,
  "prescription": [
    {"drug": "<drug name>", "dosage": "<dosage>", "notes": "<important notes>"}
  ],
  "urgencyLevel": "<low|medium|high|critical>",
  "recommendations": "<brief care recommendations>"
}`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a medical AI assistant that validates diagnoses and provides safe drug recommendations. Always err on the side of caution and recommend consulting healthcare professionals for serious conditions.' 
          },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.2,
        max_tokens: 500
      }),
    });

    const aiData = await aiResponse.json();
    let aiResult;
    
    try {
      aiResult = JSON.parse(aiData.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback to basic result
      aiResult = {
        condition: topCondition.name,
        confidence: topCondition.probability,
        prescription: drugRec ? [{ 
          drug: drugRec.drug_name, 
          dosage: drugRec.dosage, 
          notes: drugRec.notes 
        }] : [],
        urgencyLevel: diagnosisData.rareFlag ? 'high' : 'medium',
        recommendations: 'Consult with a healthcare professional for proper evaluation.'
      };
    }

    // 5. Save to history if user is logged in
    if (userId) {
      const { error: historyError } = await supabase.functions.invoke('log-history', {
        body: {
          user_id: userId,
          input_text: symptoms,
          parsed_symptoms: parsedSymptoms.symptoms,
          suggested_conditions: topConditions,
          confirmed_condition: aiResult.condition
        }
      });

      if (historyError) {
        console.error('Error saving history:', historyError);
      }
    }

    const result: DiagnosisResult = {
      status: 'success',
      diagnosis: aiResult
    };

    console.log('Diagnosis completed successfully:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-enhanced-diagnosis:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Diagnosis failed. Please try again or consult a healthcare professional.' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});