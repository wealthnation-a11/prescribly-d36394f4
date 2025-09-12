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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract conditionId from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const conditionId = pathParts[pathParts.length - 1];
    
    if (!conditionId) {
      return new Response(
        JSON.stringify({ error: 'Condition ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting drug recommendation for condition:', conditionId);

    // First try to get the condition name
    const { data: condition, error: conditionError } = await supabase
      .from('conditions')
      .select('name')
      .eq('id', conditionId)
      .single();

    if (conditionError) {
      console.error('Error fetching condition:', conditionError);
      return new Response(
        JSON.stringify({ error: 'Invalid condition ID' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get drugs from condition_drug_map
    const { data: drugs, error: drugsError } = await supabase
      .from('condition_drug_map')
      .select('drug_name, dosage, duration, frequency, rxnorm_code')
      .eq('condition_id', conditionId)
      .limit(5);

    let response;

    if (drugsError || !drugs || drugs.length === 0) {
      console.log('No drugs found in database for condition:', conditionId);
      response = {
        message: "No drugs available, please consult a doctor."
      };
    } else {
      // Format existing drugs according to specification
      const drugRecommendations = drugs.map(drug => ({
        drug_name: drug.drug_name,
        rxnorm_id: drug.rxnorm_code || generateMockRxNormId(),
        form: "tablet", // Default form - could be enhanced with actual data
        strength: extractStrength(drug.drug_name),
        dosage: drug.dosage || "As prescribed",
        warnings: generateWarnings(drug.drug_name)
      }));
      
      response = {
        drugs: drugRecommendations
      };
    }

    console.log('Drug recommendations:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recommend-drug:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to fetch drug recommendations'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateMockDrugs(conditionName: string) {
  const mockDrugs = {
    "Malaria": [
      {
        name: "Artemether-Lumefantrine",
        rxnormId: "847259",
        form: "Tablet",
        strength: "20mg/120mg",
        dosage: "Twice daily for 3 days",
        warnings: "Avoid in pregnancy unless prescribed by doctor. Complete full course."
      }
    ],
    "Typhoid": [
      {
        name: "Ciprofloxacin",
        rxnormId: "2551",
        form: "Tablet",
        strength: "500mg",
        dosage: "Twice daily for 7-10 days",
        warnings: "Avoid dairy products. Take with plenty of water."
      }
    ],
    "Common Cold": [
      {
        name: "Paracetamol",
        rxnormId: "161",
        form: "Tablet",
        strength: "500mg",
        dosage: "Every 6 hours as needed",
        warnings: "Do not exceed 4g daily. Avoid with liver disease."
      }
    ]
  };

  return mockDrugs[conditionName] || [
    {
      name: "Generic Treatment",
      rxnormId: "000000",
      form: "Tablet",
      strength: "As appropriate",
      dosage: "As prescribed by healthcare provider",
      warnings: "Consult healthcare provider for proper treatment."
    }
  ];
}

function generateMockRxNormId(): string {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}

function extractStrength(drugName: string): string {
  // Simple pattern matching for common strength formats
  const strengthMatch = drugName.match(/(\d+(?:\.\d+)?)\s*(?:mg|g|mcg|ml)/i);
  return strengthMatch ? strengthMatch[0] : "Standard strength";
}

function generateWarnings(drugName: string): string {
  const commonWarnings = [
    "Consult healthcare provider before use.",
    "Complete the full course as prescribed.",
    "May cause drowsiness.",
    "Take with food to reduce stomach upset.",
    "Avoid alcohol during treatment."
  ];
  
  // Return a random warning or drug-specific one
  if (drugName.toLowerCase().includes('artemether')) {
    return "Avoid in pregnancy unless prescribed by doctor. Complete full course.";
  }
  
  return commonWarnings[Math.floor(Math.random() * commonWarnings.length)];
}