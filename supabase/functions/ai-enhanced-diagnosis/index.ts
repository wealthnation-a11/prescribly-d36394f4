import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const diagnosisRequestSchema = z.object({
  symptoms: z.string().min(3, "Symptoms too short").max(2000, "Symptoms too long"),
  userId: z.string().uuid().optional(),
  age: z.number().int().min(0, "Age cannot be negative").max(150, "Invalid age").optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  additionalContext: z.string().max(1000, "Additional context too long").optional()
});

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
    urgencyLevel?: string;
    recommendations?: string;
  };
  question?: string;
  matches?: any[];
  message?: string;
}

interface ConditionMatch {
  id: number;
  name: string;
  description: string;
  prevalence: number;
  matchScore: number;
  confidence: number;
  is_rare: boolean;
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

    const body = await req.json();
    
    // Validate input using Zod
    const validation = diagnosisRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Validation failed',
          details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { symptoms, userId, age, gender, additionalContext } = validation.data;

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
    const userSymptoms = symptoms.toLowerCase().split(/[,\s]+/).filter(s => s.length > 2);
    
    // 2. Get Bayesian diagnosis AND direct condition matching
    const [bayesianResult, conditionsResult] = await Promise.all([
      supabase.functions.invoke('diagnose', { body: { symptomIds, age, gender } }),
      supabase.from('conditions').select('id, name, description, prevalence, is_rare').limit(50)
    ]);

    if (bayesianResult.error) {
      console.error('Error getting Bayesian diagnosis:', bayesianResult.error);
    }

    if (conditionsResult.error) {
      console.error('Error fetching conditions:', conditionsResult.error);
    }

    // 3. Hybrid scoring: Combine Bayesian + direct matching
    const bayesianConditions = bayesianResult.data?.top || [];
    const allConditions = conditionsResult.data || [];
    
    // Create hybrid matches with enhanced confidence scoring
    const hybridMatches: ConditionMatch[] = allConditions.map(condition => {
      // Find Bayesian score for this condition
      const bayesianMatch = bayesianConditions.find(b => b.condition_id === condition.id);
      const bayesianScore = bayesianMatch?.probability || 0;
      
      // Calculate direct text matching score
      const conditionTerms = [
        condition.name.toLowerCase(),
        ...(condition.description?.toLowerCase().split(/\s+/) || [])
      ];
      
      const matchScore = userSymptoms.filter(symptom => 
        conditionTerms.some(term => 
          term.includes(symptom) || symptom.includes(term)
        )
      ).length;
      
      // Hybrid confidence: weighted combination of Bayesian + text matching + prevalence
      const textMatchWeight = matchScore > 0 ? (matchScore / userSymptoms.length) * 30 : 0;
      const prevalenceWeight = (condition.prevalence || 0.1) * 10;
      const confidence = Math.min(95, bayesianScore * 0.7 + textMatchWeight + prevalenceWeight);
      
      return {
        id: condition.id,
        name: condition.name,
        description: condition.description,
        prevalence: condition.prevalence || 0.1,
        matchScore,
        confidence,
        is_rare: condition.is_rare || false
      };
    }).sort((a, b) => b.confidence - a.confidence);

    const topMatches = hybridMatches.slice(0, 3);
    const topCondition = topMatches[0];

    // 4. Intelligent guided questioning based on confidence thresholds
    if (!topCondition || topCondition.confidence < 70) {
      // Generate context-aware questions based on top matches
      let guidedQuestion = 'Can you describe your symptoms in more detail?';
      
      if (topMatches.length > 0) {
        const topConditionName = topMatches[0].name;
        const relatedSymptoms = await getRelatedSymptoms(supabase, topMatches[0].id);
        
        if (relatedSymptoms.length > 0) {
          const symptomList = relatedSymptoms.slice(0, 3).join(', ');
          guidedQuestion = `Based on your symptoms, you might have ${topConditionName}. Are you also experiencing: ${symptomList}?`;
        }
      }

      return new Response(
        JSON.stringify({
          status: 'guided',
          question: guidedQuestion,
          matches: topMatches.map(m => ({
            name: m.name,
            confidence: m.confidence,
            description: m.description
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get multiple drug recommendations for top conditions
    const drugPromises = topMatches.slice(0, 3).map(condition => 
      supabase.from('drug_recommendations')
        .select('drug_name, dosage, notes')
        .eq('condition_id', condition.id)
        .limit(2)
    );
    
    const drugResults = await Promise.all(drugPromises);
    const availableDrugs = drugResults.flatMap((result, index) => 
      (result.data || []).map(drug => ({
        ...drug,
        condition_name: topMatches[index].name,
        condition_id: topMatches[index].id
      }))
    );

    // 6. Enhanced AI validation with comprehensive analysis
    const aiPrompt = `You are Prescribly's AI Diagnostic Assistant. Analyze this medical case comprehensively:

PATIENT PROFILE:
- Symptoms: ${symptoms}
- Age: ${age || 'Not specified'}
- Gender: ${gender || 'Not specified'}
${additionalContext ? `- Additional context: ${additionalContext}` : ''}

DIAGNOSTIC ANALYSIS:
Top 3 Potential Conditions:
${topMatches.map((match, i) => 
  `${i + 1}. ${match.name} (${match.confidence.toFixed(1)}% confidence)
     Description: ${match.description}
     Prevalence: ${(match.prevalence * 100).toFixed(2)}%
     Rare condition: ${match.is_rare ? 'Yes' : 'No'}`
).join('\n')}

AVAILABLE MEDICATIONS:
${availableDrugs.map(drug => 
  `- ${drug.drug_name} (${drug.dosage}) for ${drug.condition_name}
    Notes: ${drug.notes || 'Standard treatment'}`
).join('\n')}

TASK: Validate the diagnosis and provide comprehensive medical guidance. Return ONLY valid JSON:
{
  "condition": "<most likely condition name>",
  "confidence": <final confidence percentage (1-95)>,
  "prescription": [
    {"drug": "<safest, most appropriate drug>", "dosage": "<dosage>", "notes": "<critical safety notes>"}
  ],
  "urgencyLevel": "<low|medium|high|critical>",
  "recommendations": "<comprehensive care recommendations>",
  "redFlags": "<any concerning symptoms that require immediate attention>"
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
      // Fallback to hybrid result
      aiResult = {
        condition: topCondition.name,
        confidence: topCondition.confidence,
        prescription: availableDrugs.slice(0, 1).map(drug => ({ 
          drug: drug.drug_name, 
          dosage: drug.dosage, 
          notes: drug.notes || 'Consult doctor before use'
        })),
        urgencyLevel: topCondition.is_rare || topCondition.confidence > 80 ? 'high' : 'medium',
        recommendations: 'Based on hybrid analysis. Consult healthcare professional for confirmation.',
        redFlags: topCondition.is_rare ? 'Potential rare condition detected' : 'Standard follow-up recommended'
      };
    }

    // 7. Enhanced history tracking with detailed analysis
    if (userId) {
      const historyData = {
        user_id: userId,
        input_text: symptoms,
        parsed_symptoms: parsedSymptoms.symptoms || [],
        suggested_conditions: topMatches.map(m => ({
          name: m.name,
          confidence: m.confidence,
          match_score: m.matchScore
        })),
        confirmed_condition: aiResult.condition,
        analysis_metadata: {
          hybrid_scoring: true,
          ai_enhanced: true,
          confidence_threshold_met: topCondition.confidence >= 70,
          drugs_considered: availableDrugs.length,
          urgency_level: aiResult.urgencyLevel
        }
      };

      const { error: historyError } = await supabase.functions.invoke('log-history', {
        body: historyData
      });

      if (historyError) {
        console.error('Error saving enhanced history:', historyError);
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
    console.error('Error in hybrid diagnosis system:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Hybrid diagnosis failed. Please try again or consult a healthcare professional.' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to get related symptoms for guided questioning
async function getRelatedSymptoms(supabase: any, conditionId: number): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('condition_symptoms')
      .select(`
        symptoms:symptom_id (
          name
        )
      `)
      .eq('condition_id', conditionId)
      .limit(5);
    
    return data?.map((item: any) => item.symptoms?.name).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching related symptoms:', error);
    return [];
  }
}