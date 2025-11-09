import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const prescribeRequestSchema = z.object({
  condition_id: z.number().int().positive({ message: "Invalid condition ID" }),
  user_profile: z.object({
    age: z.number().int().min(0).max(150).optional(),
    pregnant: z.boolean().optional(),
    allergies: z.array(z.string().max(200)).max(50).optional()
  }).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    
    // Validate input using Zod
    const validation = prescribeRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          prescribeAllowed: false,
          error: 'Validation failed', 
          details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { condition_id, user_profile } = validation.data;

    console.log('Getting prescription for condition:', condition_id);

    // Get condition details first
    const { data: condition, error: condError } = await supabase
      .from('conditions')
      .select('*')
      .eq('id', condition_id)
      .single();

    if (condError || !condition) {
      return new Response(
        JSON.stringify({
          prescribeAllowed: false,
          message: 'Condition not found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get drug recommendations
    const { data: recommendations } = await supabase
      .from('drug_recommendations')
      .select('*')
      .eq('condition_id', condition_id)
      .limit(1);

    let drugInfo = null;

    // Try drug_recommendations table first
    if (recommendations && recommendations.length > 0) {
      drugInfo = recommendations[0];
    } 
    // Fallback to conditions table drug_recommendations field
    else if (condition.drug_recommendations) {
      const drugData = typeof condition.drug_recommendations === 'string' ? 
        JSON.parse(condition.drug_recommendations) : condition.drug_recommendations;
      
      drugInfo = {
        drug_name: drugData.drug_name || drugData.name,
        dosage: drugData.dosage,
        notes: drugData.notes,
        is_prescription: drugData.is_prescription || false
      };
    }

    // No drug information available
    if (!drugInfo || !drugInfo.drug_name) {
      return new Response(
        JSON.stringify({
          prescribeAllowed: false,
          message: 'No medication recommendation available for this condition',
          drug_name: 'Consult Healthcare Provider',
          dosage: 'As prescribed',
          notes: 'Please consult with a licensed healthcare provider for appropriate treatment options.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Safety checks if user profile provided
    if (user_profile) {
      // Pregnancy check
      if (user_profile.pregnant && drugInfo.drug_name) {
        const drugName = drugInfo.drug_name.toLowerCase();
        // Simple pregnancy safety check (expand this list as needed)
        const pregnancyUnsafe = ['aspirin', 'ibuprofen', 'warfarin', 'ace inhibitor'];
        if (pregnancyUnsafe.some(unsafe => drugName.includes(unsafe))) {
          return new Response(
            JSON.stringify({
              prescribeAllowed: false,
              message: 'This medication may not be safe during pregnancy. Please consult your doctor.',
              requiresConsultation: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Age restrictions
      if (user_profile.age) {        
        const age = parseInt(user_profile.age);
        if (age < 18 && drugInfo.drug_name.toLowerCase().includes('aspirin')) {
          return new Response(
            JSON.stringify({
              prescribeAllowed: false,
              message: 'This medication is not recommended for individuals under 18. Please consult a healthcare provider.',
              requiresConsultation: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check if prescription medication
    if (drugInfo.is_prescription) {
      return new Response(
        JSON.stringify({
          prescribeAllowed: false,
          requireClinicianApproval: true,
          drug_name: drugInfo.drug_name,
          dosage: drugInfo.dosage || 'As prescribed by physician',
          notes: drugInfo.notes || 'This medication requires a prescription from a licensed healthcare provider.',
          message: 'Prescription medication requires healthcare provider approval'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTC medication - allow with disclaimer
    return new Response(
      JSON.stringify({
        prescribeAllowed: true,
        drug_name: drugInfo.drug_name,
        dosage: drugInfo.dosage || 'Follow package instructions',
        notes: drugInfo.notes || 'This is an over-the-counter medication. Please read all labels and consult a pharmacist or healthcare provider if you have questions.',
        isOTC: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in prescribe function:', error);
    return new Response(
      JSON.stringify({ 
        prescribeAllowed: false,
        error: 'Internal server error',
        message: 'Unable to process prescription request. Please try again or consult a healthcare provider.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});