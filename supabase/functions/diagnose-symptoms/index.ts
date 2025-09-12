import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, demographicInfo } = await req.json();
    
    console.log('Processing diagnosis request:', { symptoms, demographicInfo });

    // Mock diagnosis results for now
    const mockDiagnoses = [
      {
        condition_id: 'c1',
        condition_name: 'Common Cold',
        probability: 0.85,
        explanation: 'Based on symptoms like runny nose, sore throat, and mild fever, this appears to be a viral upper respiratory infection.',
        severity: 'mild',
        recommendations: ['Rest', 'Stay hydrated', 'Over-the-counter pain relievers']
      },
      {
        condition_id: 'c2', 
        condition_name: 'Seasonal Allergies',
        probability: 0.65,
        explanation: 'Symptoms suggest allergic rhinitis, especially if occurring during allergy season.',
        severity: 'mild',
        recommendations: ['Antihistamines', 'Avoid known allergens', 'Use air purifier']
      },
      {
        condition_id: 'c3',
        condition_name: 'Acute Sinusitis',
        probability: 0.45,
        explanation: 'Facial pressure and congestion may indicate sinus inflammation.',
        severity: 'moderate',
        recommendations: ['Nasal decongestants', 'Steam inhalation', 'Consult doctor if symptoms persist']
      }
    ];

    // In the future, this would call an AI service or Bayesian inference
    // For now, return mock data based on input
    const response = {
      success: true,
      diagnoses: mockDiagnoses,
      session_id: crypto.randomUUID(),
      processed_at: new Date().toISOString(),
      input_symptoms: symptoms,
      demographic_info: demographicInfo
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