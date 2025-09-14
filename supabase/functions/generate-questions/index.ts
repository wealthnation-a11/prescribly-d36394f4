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
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    // Get the user from the auth header
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    console.log('Auth check result:', { user: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { symptoms } = await req.json();
    const sessionId = crypto.randomUUID();

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return new Response(JSON.stringify({ error: 'Symptoms are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating questions for symptoms:', symptoms);

    // Generate 5 clarifying questions based on symptoms
    const questions = generateClarifyingQuestions(symptoms);

    // Save questions to database
    const questionsToSave = questions.map(q => ({
      session_id: sessionId,
      question: q.question,
      user_answer: null,
    }));

    const { error: insertError } = await supabaseClient
      .from('assessment_questions')
      .insert(questionsToSave);

    if (insertError) {
      console.error('Database error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      session_id: sessionId,
      questions: questions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateClarifyingQuestions(symptoms: string[]) {
  const allQuestions = [
    // Pain-related questions
    {
      id: 'pain_severity',
      question: 'How would you rate your pain on a scale of 1-10?',
      type: 'scale',
      triggers: ['pain', 'headache', 'ache', 'hurt']
    },
    {
      id: 'pain_duration',
      question: 'How long have you been experiencing this pain?',
      type: 'select',
      options: ['Less than 1 hour', '1-6 hours', '6-24 hours', '1-3 days', 'More than 3 days'],
      triggers: ['pain', 'headache', 'ache', 'hurt']
    },

    // Fever-related questions
    {
      id: 'fever_temp',
      question: 'What is your current temperature if measured?',
      type: 'text',
      triggers: ['fever', 'hot', 'temperature', 'chills']
    },
    {
      id: 'fever_duration',
      question: 'When did the fever start?',
      type: 'select',
      options: ['Today', 'Yesterday', '2-3 days ago', 'More than 3 days ago'],
      triggers: ['fever', 'hot', 'temperature']
    },

    // Cough-related questions
    {
      id: 'cough_type',
      question: 'What type of cough do you have?',
      type: 'select',
      options: ['Dry cough', 'Productive cough with phlegm', 'Cough with blood'],
      triggers: ['cough', 'coughing']
    },

    // Breathing-related questions
    {
      id: 'breathing_difficulty',
      question: 'Are you experiencing difficulty breathing?',
      type: 'select',
      options: ['No difficulty', 'Mild shortness of breath', 'Moderate difficulty', 'Severe difficulty'],
      triggers: ['breath', 'breathing', 'shortness', 'wheezing', 'asthma']
    },

    // Digestive questions
    {
      id: 'nausea_severity',
      question: 'How severe is your nausea?',
      type: 'select',
      options: ['Mild', 'Moderate', 'Severe'],
      triggers: ['nausea', 'vomit', 'stomach', 'digestive']
    },
    {
      id: 'appetite_change',
      question: 'Has your appetite changed recently?',
      type: 'select',
      options: ['No change', 'Decreased appetite', 'Increased appetite', 'Complete loss of appetite'],
      triggers: ['stomach', 'digestive', 'nausea', 'eating']
    },

    // General questions
    {
      id: 'symptom_onset',
      question: 'When did your symptoms first start?',
      type: 'select',
      options: ['Today', 'Yesterday', '2-3 days ago', '4-7 days ago', 'More than a week ago'],
      triggers: ['*'] // Always relevant
    },
    {
      id: 'severity_overall',
      question: 'How would you rate the overall severity of your symptoms?',
      type: 'select',
      options: ['Mild', 'Moderate', 'Severe', 'Very severe'],
      triggers: ['*'] // Always relevant
    },

    // Sleep and energy
    {
      id: 'sleep_quality',
      question: 'How has your sleep been affected?',
      type: 'select',
      options: ['Normal sleep', 'Difficulty falling asleep', 'Frequent waking', 'Unable to sleep'],
      triggers: ['fatigue', 'tired', 'exhausted', 'sleep']
    }
  ];

  const symptomText = symptoms.join(' ').toLowerCase();
  const relevantQuestions = allQuestions.filter(q => {
    if (q.triggers.includes('*')) return true;
    return q.triggers.some(trigger => symptomText.includes(trigger));
  });

  // Return exactly 5 questions, prioritizing the most relevant ones
  const selectedQuestions = relevantQuestions.slice(0, 5);
  
  // If we don't have 5 relevant questions, add general ones
  if (selectedQuestions.length < 5) {
    const generalQuestions = allQuestions.filter(q => q.triggers.includes('*'));
    for (const q of generalQuestions) {
      if (selectedQuestions.length >= 5) break;
      if (!selectedQuestions.find(sq => sq.id === q.id)) {
        selectedQuestions.push(q);
      }
    }
  }

  return selectedQuestions.map(q => ({
    id: q.id,
    question: q.question,
    type: q.type,
    options: q.options
  }));
}