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

    // Extract condition ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const conditionId = pathParts[pathParts.length - 1];

    console.log('Getting drug recommendations for condition ID:', conditionId);

    if (!conditionId || conditionId === 'recommend-drug') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Condition ID is required',
          recommendations: []
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get drug recommendations from condition_drug_map table
    const { data: drugMappings, error: drugError } = await supabase
      .from('condition_drug_map')
      .select('*')
      .eq('condition_id', conditionId);

    if (drugError) {
      console.error('Error fetching drug mappings:', drugError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch drug recommendations',
          recommendations: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${drugMappings?.length || 0} drug mappings for condition ${conditionId}`);

    // If no drugs found in database, return appropriate message
    if (!drugMappings || drugMappings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          condition_id: conditionId,
          recommendations: [],
          message: "No drugs available, please consult a doctor.",
          total_found: 0,
          retrieved_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format drug recommendations from database
    const recommendations = drugMappings.map(drug => ({
      drug_name: drug.drug_name,
      rxnorm_id: drug.rxnorm_code || 'N/A',
      form: inferDrugForm(drug.drug_name),
      strength: drug.dosage || 'As prescribed',
      dosage: drug.dosage || 'Follow healthcare provider instructions',
      frequency: drug.frequency || 'As directed',
      duration: drug.duration || 'As prescribed',
      warnings: generateWarnings(drug.drug_name),
      notes: drug.notes || null,
      source: 'database'
    }));

    const response = {
      success: true,
      condition_id: conditionId,
      recommendations: recommendations,
      total_found: recommendations.length,
      disclaimer: 'AI-generated recommendations. Always consult healthcare provider before taking any medication.',
      retrieved_at: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recommend-drug function:', error);
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

// Helper function to infer drug form from name
function inferDrugForm(drugName: string): string {
  const lowerName = drugName.toLowerCase();
  
  if (lowerName.includes('spray') || lowerName.includes('nasal')) return 'Nasal Spray';
  if (lowerName.includes('syrup') || lowerName.includes('liquid')) return 'Syrup';
  if (lowerName.includes('cream') || lowerName.includes('ointment')) return 'Topical Cream';
  if (lowerName.includes('gel')) return 'Topical Gel';
  if (lowerName.includes('capsule')) return 'Capsule';
  if (lowerName.includes('injection') || lowerName.includes('injectable')) return 'Injection';
  if (lowerName.includes('patch')) return 'Patch';
  
  return 'Tablet'; // Default form
}

// Helper function to generate warnings based on drug name
function generateWarnings(drugName: string): string[] {
  const lowerName = drugName.toLowerCase();
  const warnings = ['Consult healthcare provider before use'];
  
  if (lowerName.includes('acetaminophen') || lowerName.includes('paracetamol')) {
    warnings.push('Do not exceed recommended dose');
    warnings.push('Avoid alcohol consumption');
    warnings.push('Risk of liver damage with overdose');
  }
  
  if (lowerName.includes('ibuprofen') || lowerName.includes('naproxen')) {
    warnings.push('Take with food to reduce stomach irritation');
    warnings.push('May increase risk of cardiovascular events');
    warnings.push('Avoid if you have kidney problems');
  }
  
  if (lowerName.includes('aspirin')) {
    warnings.push('Take with food');
    warnings.push('May increase bleeding risk');
    warnings.push('Not recommended for children under 16');
  }
  
  if (lowerName.includes('antibiotic') || lowerName.includes('amoxicillin') || lowerName.includes('azithromycin')) {
    warnings.push('Complete the full course as prescribed');
    warnings.push('May cause digestive upset');
    warnings.push('Inform doctor of any allergies');
  }
  
  if (lowerName.includes('steroid') || lowerName.includes('prednisone')) {
    warnings.push('Do not stop suddenly');
    warnings.push('May suppress immune system');
    warnings.push('Monitor blood sugar levels');
  }
  
  return warnings;
}