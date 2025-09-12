import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RxNorm API base URL (for future integration)
const RXNORM_API_BASE = 'https://rxnav.nlm.nih.gov/REST';

// Function to call actual RxNorm API
async function callRxNormApi(conditionId: string) {
  try {
    // First, try to get related drugs by condition name
    const conditionName = getConditionName(conditionId);
    
    if (!conditionName) {
      console.log('Unknown condition ID, using mock data');
      return null;
    }

    // Search for drugs related to the condition
    const searchUrl = `${RXNORM_API_BASE}/drugs.json?name=${encodeURIComponent(conditionName)}`;
    console.log('Calling RxNorm API:', searchUrl);
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HealthApp/1.0'
      }
    });

    if (!response.ok) {
      console.log('RxNorm API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data?.drugGroup?.conceptGroup) {
      const drugs = [];
      for (const group of data.drugGroup.conceptGroup) {
        if (group.conceptProperties) {
          for (const drug of group.conceptProperties.slice(0, 5)) { // Limit to 5 drugs
            drugs.push({
              drug_name: drug.name,
              rxnorm_id: drug.rxcui,
              form: drug.synonym || 'Various',
              strength: 'Various',
              dosage: 'As directed by healthcare provider',
              warnings: ['Consult healthcare provider', 'Follow prescription instructions'],
              category: group.tty || 'Medication',
              first_line: false,
              source: 'rxnorm_api'
            });
          }
        }
      }
      
      console.log(`RxNorm API returned ${drugs.length} drugs`);
      return drugs;
    }
    
    return null;
  } catch (error) {
    console.error('RxNorm API call failed:', error);
    return null;
  }
}

// Helper function to map condition IDs to names for RxNorm search
function getConditionName(conditionId: string): string | null {
  const conditionMap: Record<string, string> = {
    'c1': 'common cold',
    'c2': 'allergic rhinitis',
    'c3': 'sinusitis',
    'c4': 'migraine',
    'c5': 'tension headache'
  };
  
  return conditionMap[conditionId] || null;
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

    let symptoms: string[] = [];
    let conditionId: string | null = null;

    // Handle both URL parameter (legacy) and POST body (new approach)
    if (req.method === 'POST') {
      const body = await req.json();
      symptoms = body.symptoms || [];
      console.log('Getting drug recommendations for symptoms:', symptoms);
    } else {
      // Legacy GET approach with condition ID
      const url = new URL(req.url);
      conditionId = url.pathname.split('/').pop();
      console.log('Getting drug recommendations for condition:', conditionId);
    }

    let recommendations = [];

    if (symptoms.length > 0) {
      // New approach: map symptoms to drug recommendations
      recommendations = await getDrugRecommendationsFromSymptoms(symptoms, supabase);
    } else if (conditionId) {
      // Legacy approach: use condition ID
      recommendations = await getDrugRecommendationsFromCondition(conditionId, supabase);
    }

    // Add additional drug information and safety checks
    const enhancedRecommendations = recommendations.map(drug => ({
      ...drug,
      safety_rating: getSafetyRating(drug.name || drug.drug_name),
      contraindications: getContraindications(drug.name || drug.drug_name),
      pregnancy_category: getPregnancyCategory(drug.name || drug.drug_name)
    }));

    const response = {
      success: true,
      symptoms: symptoms,
      condition_id: conditionId,
      recommendations: enhancedRecommendations,
      total_found: enhancedRecommendations.length,
      disclaimer: 'AI-generated recommendations. Always consult healthcare provider before taking any medication.',
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

// New function to get drug recommendations from symptoms
async function getDrugRecommendationsFromSymptoms(symptoms: string[], supabase) {
  const symptomText = symptoms.join(' ').toLowerCase();
  
  // Map common symptoms to drug recommendations
  const symptomDrugMap = {
    // Pain/Headache symptoms
    'headache': [
      {
        name: 'Acetaminophen',
        rxnorm_code: '161',
        form: 'Tablet',
        strength: '500mg',
        dosage: '500-1000mg every 4-6 hours',
        frequency: 'Every 4-6 hours as needed',
        duration: 'Up to 10 days',
        warnings: 'Do not exceed 3000mg per day. Avoid alcohol.'
      },
      {
        name: 'Ibuprofen',
        rxnorm_code: '5640',
        form: 'Tablet',
        strength: '200mg',
        dosage: '200-400mg every 6-8 hours',
        frequency: 'Every 6-8 hours as needed',
        duration: 'Up to 10 days',
        warnings: 'Take with food. May cause stomach upset.'
      }
    ],
    'pain': [
      {
        name: 'Acetaminophen',
        rxnorm_code: '161',
        form: 'Tablet',
        strength: '500mg',
        dosage: '500-1000mg every 4-6 hours',
        frequency: 'Every 4-6 hours as needed',
        duration: 'Up to 10 days',
        warnings: 'Do not exceed 3000mg per day. Avoid alcohol.'
      }
    ],
    // Cold/Flu symptoms
    'fever': [
      {
        name: 'Acetaminophen',
        rxnorm_code: '161',
        form: 'Tablet',
        strength: '500mg',
        dosage: '500-1000mg every 4-6 hours',
        frequency: 'Every 4-6 hours as needed',
        duration: 'Until fever subsides',
        warnings: 'Do not exceed 3000mg per day.'
      },
      {
        name: 'Ibuprofen',
        rxnorm_code: '5640',
        form: 'Tablet',
        strength: '200mg',
        dosage: '200-400mg every 6-8 hours',
        frequency: 'Every 6-8 hours as needed',
        duration: 'Until fever subsides',
        warnings: 'Take with food to reduce stomach irritation.'
      }
    ],
    'cough': [
      {
        name: 'Dextromethorphan',
        rxnorm_code: '3008',
        form: 'Syrup',
        strength: '15mg/5ml',
        dosage: '15-30mg every 4 hours',
        frequency: 'Every 4 hours as needed',
        duration: 'Up to 7 days',
        warnings: 'May cause drowsiness. Do not exceed recommended dose.'
      }
    ],
    'nausea': [
      {
        name: 'Ondansetron',
        rxnorm_code: '37801',
        form: 'Tablet',
        strength: '4mg',
        dosage: '4-8mg every 8 hours',
        frequency: 'Every 8 hours as needed',
        duration: 'Until symptoms resolve',
        warnings: 'May cause constipation. Prescription required.'
      }
    ],
    // Allergy symptoms
    'runny nose': [
      {
        name: 'Loratadine',
        rxnorm_code: '6188',
        form: 'Tablet',
        strength: '10mg',
        dosage: '10mg once daily',
        frequency: 'Once daily',
        duration: 'As needed during allergy season',
        warnings: 'Non-drowsy formula. Safe for daily use.'
      }
    ],
    'congestion': [
      {
        name: 'Pseudoephedrine',
        rxnorm_code: '8745',
        form: 'Tablet',
        strength: '30mg',
        dosage: '30-60mg every 4-6 hours',
        frequency: 'Every 4-6 hours as needed',
        duration: 'Up to 7 days',
        warnings: 'May increase blood pressure. ID required for purchase.'
      }
    ]
  };

  const matchedDrugs = [];
  
  // Find matching drugs based on symptoms
  for (const [symptom, drugs] of Object.entries(symptomDrugMap)) {
    if (symptomText.includes(symptom)) {
      matchedDrugs.push(...drugs.map(drug => ({
        ...drug,
        matched_symptom: symptom,
        source: 'symptom_mapping'
      })));
    }
  }

  // Remove duplicates based on drug name
  const uniqueDrugs = matchedDrugs.filter((drug, index, self) => 
    index === self.findIndex(d => d.name === drug.name)
  );

  console.log(`Found ${uniqueDrugs.length} drug recommendations for symptoms:`, symptoms);
  
  return uniqueDrugs;
}

// Legacy function for condition-based recommendations
async function getDrugRecommendationsFromCondition(conditionId: string, supabase) {
  // First, try to get recommendations from our condition_drug_map table
  const { data: dbRecommendations, error: dbError } = await supabase
    .from('condition_drug_map')
    .select('*')
    .eq('condition_id', conditionId)
    .order('first_line', { ascending: false }); // First-line treatments first

  let recommendations = [];

  if (dbError) {
    console.error('Database error:', dbError);
  } else if (dbRecommendations && dbRecommendations.length > 0) {
    // Format database results
    recommendations = dbRecommendations.map(drug => ({
      name: drug.drug_name,
      drug_name: drug.drug_name,
      rxnorm_code: drug.rxnorm_code,
      form: inferDrugForm(drug.drug_name),
      strength: inferDrugStrength(drug.drug_name),
      dosage: generateDosage(drug.drug_name),
      warnings: generateWarnings(drug.drug_name),
      category: inferDrugCategory(drug.drug_name),
      first_line: drug.first_line,
      notes: drug.notes,
      source: 'database'
    }));
    
    console.log(`Found ${recommendations.length} recommendations in database`);
  }

  // If no database results, try RxNorm API
  if (recommendations.length === 0) {
    console.log('No database results, trying RxNorm API');
    const rxnormResults = await callRxNormApi(conditionId);
    
    if (rxnormResults && rxnormResults.length > 0) {
      recommendations = rxnormResults.map(drug => ({
        ...drug,
        name: drug.drug_name
      }));
    } else {
      // Fall back to mock data
      console.log('RxNorm API failed, using mock data');
      const mockResults = await getMockRxNormRecommendations(conditionId);
      recommendations = mockResults.map(drug => ({
        ...drug,
        name: drug.drug_name
      }));
    }
  }

  return recommendations;
}

// Mock RxNorm API responses for different conditions
async function getMockRxNormRecommendations(conditionId) {
  const mockData: Record<string, any[]> = {
    'c1': [ // Common Cold
      {
        drug_name: 'Acetaminophen',
        rxnorm_id: '161',
        form: 'Tablet',
        strength: '500mg',
        dosage: '500-1000mg every 4-6 hours, max 3000mg/day',
        warnings: ['Hepatotoxicity with overdose', 'Avoid alcohol'],
        category: 'Analgesic/Antipyretic',
        first_line: true,
        source: 'rxnorm_mock'
      },
      {
        drug_name: 'Dextromethorphan',
        rxnorm_id: '3008',
        form: 'Syrup',
        strength: '15mg/5ml',
        dosage: '15-30mg every 4 hours, max 120mg/day',
        warnings: ['May cause drowsiness', 'Avoid with MAOIs'],
        category: 'Antitussive',
        first_line: false,
        source: 'rxnorm_mock'
      }
    ],
    'c2': [ // Seasonal Allergies
      {
        drug_name: 'Loratadine',
        rxnorm_id: '6188',
        form: 'Tablet',
        strength: '10mg',
        dosage: '10mg once daily',
        warnings: ['Minimal sedation', 'Adjust dose in liver impairment'],
        category: 'H1 Antihistamine',
        first_line: true,
        source: 'rxnorm_mock'
      },
      {
        drug_name: 'Fluticasone Propionate',
        rxnorm_id: '18631',
        form: 'Nasal Spray',
        strength: '50mcg/spray',
        dosage: '2 sprays each nostril daily',
        warnings: ['Local irritation possible', 'Prime before use'],
        category: 'Intranasal Corticosteroid',
        first_line: true,
        source: 'rxnorm_mock'
      }
    ],
    'c3': [ // Acute Sinusitis
      {
        drug_name: 'Pseudoephedrine',
        rxnorm_id: '8745',
        form: 'Tablet',
        strength: '30mg',
        dosage: '30-60mg every 4-6 hours, max 240mg/day',
        warnings: ['Hypertension', 'Insomnia', 'Behind-counter purchase'],
        category: 'Decongestant',
        first_line: true,
        source: 'rxnorm_mock'
      },
      {
        drug_name: 'Amoxicillin',
        rxnorm_id: '723',
        form: 'Capsule',
        strength: '500mg',
        dosage: '500mg every 8 hours for 7-10 days',
        warnings: ['Penicillin allergy', 'GI upset', 'Prescription required'],
        category: 'Antibiotic',
        first_line: false,
        notes: 'For suspected bacterial infection only',
        source: 'rxnorm_mock'
      }
    ],
    'c4': [ // Migraine
      {
        drug_name: 'Sumatriptan',
        rxnorm_id: '37801',
        form: 'Tablet',
        strength: '50mg',
        dosage: '50-100mg at onset, max 200mg/day',
        warnings: ['Cardiovascular disease', 'Medication overuse headache'],
        category: 'Triptan',
        first_line: true,
        source: 'rxnorm_mock'
      }
    ],
    'c5': [ // Tension Headache
      {
        drug_name: 'Ibuprofen',
        rxnorm_id: '5640',
        form: 'Tablet',
        strength: '200mg',
        dosage: '200-400mg every 4-6 hours, max 1200mg/day',
        warnings: ['GI bleeding', 'Kidney impairment', 'Take with food'],
        category: 'NSAID',
        first_line: true,
        source: 'rxnorm_mock'
      }
    ]
  };

  return mockData[conditionId] || [];
}

// Helper functions to infer drug properties
function inferDrugForm(drugName) {
  const forms = {
    'spray': 'Nasal Spray',
    'syrup': 'Syrup',
    'cream': 'Topical Cream',
    'gel': 'Topical Gel'
  };
  
  const lowerName = drugName.toLowerCase();
  for (const [key, form] of Object.entries(forms)) {
    if (lowerName.includes(key)) return form;
  }
  return 'Tablet'; // Default
}

function inferDrugStrength(drugName) {
  // Common strengths for known drugs
  const strengths = {
    'acetaminophen': '500mg',
    'ibuprofen': '200mg',
    'loratadine': '10mg',
    'pseudoephedrine': '30mg',
    'fluticasone': '50mcg/spray',
    'amoxicillin': '500mg'
  };
  
  const lowerName = drugName.toLowerCase();
  return strengths[lowerName] || 'Various';
}

function generateDosage(drugName) {
  const dosages = {
    'acetaminophen': '500-1000mg every 4-6 hours (max 3000mg/day)',
    'ibuprofen': '200-400mg every 6-8 hours (max 1200mg/day)',
    'loratadine': '10mg once daily',
    'pseudoephedrine': '30-60mg every 4-6 hours (max 240mg/day)',
    'fluticasone': '2 sprays per nostril daily',
    'amoxicillin': '500mg every 8 hours for 7-10 days'
  };
  
  return dosages[drugName.toLowerCase()] || 'As directed by healthcare provider';
}

function generateWarnings(drugName) {
  const warnings = {
    'acetaminophen': ['Liver damage with overdose', 'Avoid alcohol', 'Max 3000mg/day'],
    'ibuprofen': ['GI bleeding risk', 'Kidney impairment', 'Take with food'],
    'loratadine': ['Minimal drowsiness', 'Reduce dose in liver disease'],
    'pseudoephedrine': ['May increase blood pressure', 'Can cause insomnia'],
    'fluticasone': ['Prime before first use', 'May cause nasal irritation'],
    'amoxicillin': ['Penicillin allergy', 'May cause diarrhea', 'Complete full course']
  };
  
  return warnings[drugName.toLowerCase()] || ['Consult healthcare provider'];
}

function inferDrugCategory(drugName) {
  const categories = {
    'acetaminophen': 'Analgesic/Antipyretic',
    'ibuprofen': 'NSAID',
    'loratadine': 'Antihistamine',
    'pseudoephedrine': 'Decongestant',
    'fluticasone': 'Nasal Corticosteroid',
    'amoxicillin': 'Antibiotic'
  };
  
  return categories[drugName.toLowerCase()] || 'Medication';
}

function getSafetyRating(drugName) {
  // Simple safety rating system
  const safetyRatings = {
    'acetaminophen': 'High',
    'ibuprofen': 'Moderate',
    'loratadine': 'High',
    'pseudoephedrine': 'Moderate',
    'fluticasone': 'High',
    'amoxicillin': 'Moderate'
  };
  
  return safetyRatings[drugName.toLowerCase()] || 'Consult Provider';
}

function getContraindications(drugName) {
  const contraindications = {
    'acetaminophen': ['Severe liver disease'],
    'ibuprofen': ['Active GI bleeding', 'Severe kidney disease'],
    'loratadine': ['Severe liver impairment'],
    'pseudoephedrine': ['Severe hypertension', 'MAO inhibitor use'],
    'fluticasone': ['Nasal septal ulcers'],
    'amoxicillin': ['Penicillin allergy']
  };
  
  return contraindications[drugName.toLowerCase()] || [];
}

function getPregnancyCategory(drugName) {
  const pregnancyCategories = {
    'acetaminophen': 'B',
    'ibuprofen': 'C (D in 3rd trimester)',
    'loratadine': 'B',
    'pseudoephedrine': 'C',
    'fluticasone': 'C',
    'amoxicillin': 'B'
  };
  
  return pregnancyCategories[drugName.toLowerCase()] || 'Consult Provider';
}