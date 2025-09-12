import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const conditionId = url.pathname.split('/').pop();
    
    console.log('Getting drug recommendations for condition:', conditionId);

    // Mock drug recommendations based on condition
    const mockRecommendations: Record<string, any[]> = {
      'c1': [ // Common Cold
        {
          drug_name: 'Acetaminophen',
          strength: '500mg',
          form: 'Tablet',
          dosage: '1-2 tablets every 4-6 hours',
          warnings: ['Do not exceed 3000mg per day', 'Avoid alcohol'],
          category: 'Pain Reliever'
        },
        {
          drug_name: 'Dextromethorphan',
          strength: '15mg',
          form: 'Syrup',
          dosage: '15ml every 4 hours',
          warnings: ['May cause drowsiness', 'Not for children under 6'],
          category: 'Cough Suppressant'
        }
      ],
      'c2': [ // Seasonal Allergies
        {
          drug_name: 'Loratadine',
          strength: '10mg',
          form: 'Tablet',
          dosage: '1 tablet daily',
          warnings: ['May cause drowsiness in some people', 'Take with water'],
          category: 'Antihistamine'
        },
        {
          drug_name: 'Fluticasone',
          strength: '50mcg',
          form: 'Nasal Spray',
          dosage: '2 sprays per nostril daily',
          warnings: ['Shake before use', 'Prime before first use'],
          category: 'Nasal Corticosteroid'
        }
      ],
      'c3': [ // Acute Sinusitis
        {
          drug_name: 'Pseudoephedrine',
          strength: '30mg',
          form: 'Tablet',
          dosage: '1 tablet every 4-6 hours',
          warnings: ['May increase blood pressure', 'Avoid before bedtime'],
          category: 'Decongestant'
        },
        {
          drug_name: 'Ibuprofen',
          strength: '200mg',
          form: 'Tablet',
          dosage: '1-2 tablets every 6-8 hours',
          warnings: ['Take with food', 'May cause stomach upset'],
          category: 'Anti-inflammatory'
        }
      ]
    };

    const recommendations = mockRecommendations[conditionId || ''] || [];

    // In the future, this would call RxNorm API or query condition_drug_map table
    const response = {
      success: true,
      condition_id: conditionId,
      recommendations: recommendations,
      disclaimer: 'For doctor review only. Do not self-medicate.',
      retrieved_at: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in drug-recommendations:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        recommendations: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});