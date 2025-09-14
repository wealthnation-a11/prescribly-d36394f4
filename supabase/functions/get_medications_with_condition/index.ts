import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Medication {
  drug_name: string;
  strength?: string;
  dosage: string;
  frequency?: string;
  duration?: string;
  form?: string;
  rxnorm_code?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get condition_id from query params
    const url = new URL(req.url);
    const conditionId = url.searchParams.get('condition_id');

    if (!conditionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'condition_id parameter is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Fetching medications for condition ID: ${conditionId}`);

    // Query the condition_drug_map table
    const { data: drugMappings, error: dbError } = await supabase
      .from('condition_drug_map')
      .select('*')
      .eq('condition_id', conditionId);

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch medication data from database'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${drugMappings?.length || 0} drug mappings for condition ${conditionId}`);

    // If no drugs found in database, return mock data based on condition ID
    if (!drugMappings || drugMappings.length === 0) {
      const mockMedications = getMockMedicationsForCondition(conditionId);
      
      return new Response(JSON.stringify({
        success: true,
        medications: mockMedications,
        message: mockMedications.length > 0 
          ? `Found ${mockMedications.length} recommended medications`
          : 'No medications available for this condition'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transform database results to medication format
    const medications: Medication[] = drugMappings.map(drug => ({
      drug_name: drug.drug_name,
      dosage: drug.dosage || 'As prescribed by healthcare provider',
      frequency: drug.frequency || 'Follow medical advice',
      duration: drug.duration || 'As recommended',
      form: inferDrugForm(drug.drug_name),
      strength: inferDrugStrength(drug.drug_name),
      rxnorm_code: drug.rxnorm_code || undefined
    }));

    return new Response(JSON.stringify({
      success: true,
      medications: medications,
      condition_id: conditionId,
      message: `Found ${medications.length} recommended medications`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get_medications_with_condition function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to infer drug form
function inferDrugForm(drugName: string): string {
  const name = drugName.toLowerCase();
  
  if (name.includes('spray')) return '💧 Nasal Spray';
  if (name.includes('syrup') || name.includes('liquid')) return '💧 Syrup';
  if (name.includes('injection') || name.includes('inject')) return '💉 Injection';
  if (name.includes('capsule') || name.includes('cap')) return '💊 Capsule';
  if (name.includes('cream') || name.includes('gel') || name.includes('ointment')) return '🧴 Topical';
  if (name.includes('inhaler') || name.includes('puffer')) return '🌬️ Inhaler';
  
  return '💊 Tablet'; // Default
}

// Helper function to infer drug strength
function inferDrugStrength(drugName: string): string {
  const strengthPatterns = [
    /(\d+(?:\.\d+)?)\s*mg/i,
    /(\d+(?:\.\d+)?)\s*mcg/i,
    /(\d+(?:\.\d+)?)\s*g/i,
    /(\d+(?:\.\d+)?)\s*ml/i,
    /(\d+(?:\.\d+)?)\s*%/i
  ];
  
  for (const pattern of strengthPatterns) {
    const match = drugName.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  // Default strengths based on common medications
  const name = drugName.toLowerCase();
  if (name.includes('paracetamol') || name.includes('acetaminophen')) return '500mg';
  if (name.includes('ibuprofen')) return '400mg';
  if (name.includes('aspirin')) return '300mg';
  if (name.includes('amoxicillin')) return '500mg';
  
  return 'Standard dosage';
}

// Mock medication data for testing
function getMockMedicationsForCondition(conditionId: string): Medication[] {
  const mockData: Record<string, Medication[]> = {
    'condition-0': [
      {
        drug_name: 'Paracetamol',
        strength: '500mg',
        dosage: '1-2 tablets every 4-6 hours',
        frequency: '3-4 times daily',
        duration: '3-5 days',
        form: '💊 Tablet'
      },
      {
        drug_name: 'Ibuprofen',
        strength: '400mg',
        dosage: '1 tablet every 6-8 hours',
        frequency: '2-3 times daily',
        duration: '3-7 days',
        form: '💊 Tablet'
      }
    ],
    'condition-1': [
      {
        drug_name: 'Amoxicillin',
        strength: '500mg',
        dosage: '1 capsule every 8 hours',
        frequency: '3 times daily',
        duration: '7-10 days',
        form: '💊 Capsule'
      }
    ],
    'condition-2': [
      {
        drug_name: 'Loratadine',
        strength: '10mg',
        dosage: '1 tablet once daily',
        frequency: 'Once daily',
        duration: 'As needed',
        form: '💊 Tablet'
      }
    ]
  };
  
  // Return mock data or empty array
  return mockData[conditionId] || [];
}