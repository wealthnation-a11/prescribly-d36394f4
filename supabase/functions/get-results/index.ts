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

    // Get session_id from URL params
    const url = new URL(req.url);
    const sessionId = url.pathname.split('/').pop();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching results for session:', sessionId);

    // Get diagnosis results
    const { data: diagnosisResult, error: diagnosisError } = await supabaseClient
      .from('diagnosis_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (diagnosisError) {
      console.error('Database error:', diagnosisError);
      return new Response(JSON.stringify({ error: 'Failed to fetch diagnosis results' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!diagnosisResult) {
      return new Response(JSON.stringify({ error: 'No diagnosis found for this session' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get assessment questions and answers
    const { data: questions, error: questionsError } = await supabaseClient
      .from('assessment_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
    }

    return new Response(JSON.stringify({
      success: true,
      diagnosis: {
        condition: diagnosisResult.condition,
        probability: diagnosisResult.probability,
        explanation: diagnosisResult.explanation,
        recommendations: diagnosisResult.recommendations,
        symptoms: diagnosisResult.symptoms,
        answers: diagnosisResult.answers,
        created_at: diagnosisResult.created_at
      },
      questions: questions || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-results function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});