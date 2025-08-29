import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedSymptom {
  id: string;
  name: string;
  score: number;
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

    const { text, locale = 'en' } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ symptoms: [], tokens: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing text:', text);

    // Normalize text: lowercase, remove extra spaces, basic cleanup
    const normalizedText = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = normalizedText.split(' ').filter(token => token.length > 2);
    console.log('Tokens:', tokens);

    // Get all symptoms from database
    const { data: symptoms, error: symptomsError } = await supabase
      .from('symptoms')
      .select('id, name, aliases');

    if (symptomsError) {
      console.error('Error fetching symptoms:', symptomsError);
      return new Response(
        JSON.stringify({ symptoms: [], tokens }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get condition aliases for fuzzy matching
    const { data: aliases, error: aliasesError } = await supabase
      .from('condition_aliases')
      .select('alias, condition_id')
      .join('conditions', 'conditions.id', 'condition_aliases.condition_id');

    console.log('Found symptoms:', symptoms?.length || 0);

    // Fuzzy match symptoms
    const matchedSymptoms: ParsedSymptom[] = [];
    const processedSymptoms = new Set<string>();

    // Direct name matching
    symptoms?.forEach(symptom => {
      if (processedSymptoms.has(symptom.id)) return;
      
      const symptomName = symptom.name.toLowerCase();
      
      // Check if symptom name appears in text
      if (normalizedText.includes(symptomName)) {
        matchedSymptoms.push({
          id: symptom.id,
          name: symptom.name,
          score: 1.0
        });
        processedSymptoms.add(symptom.id);
        return;
      }

      // Check aliases
      if (symptom.aliases && Array.isArray(symptom.aliases)) {
        for (const alias of symptom.aliases) {
          if (normalizedText.includes(alias.toLowerCase())) {
            matchedSymptoms.push({
              id: symptom.id,
              name: symptom.name,
              score: 0.8
            });
            processedSymptoms.add(symptom.id);
            break;
          }
        }
      }

      // Partial word matching
      if (!processedSymptoms.has(symptom.id)) {
        const words = symptomName.split(' ');
        const matchedWords = words.filter(word => 
          tokens.some(token => token.includes(word) || word.includes(token))
        );
        
        if (matchedWords.length > 0) {
          const score = matchedWords.length / words.length * 0.6;
          if (score > 0.3) {
            matchedSymptoms.push({
              id: symptom.id,
              name: symptom.name,
              score
            });
            processedSymptoms.add(symptom.id);
          }
        }
      }
    });

    // Sort by score and limit results
    matchedSymptoms.sort((a, b) => b.score - a.score);
    const topSymptoms = matchedSymptoms.slice(0, 10);

    console.log('Matched symptoms:', topSymptoms);

    return new Response(
      JSON.stringify({
        symptoms: topSymptoms,
        tokens
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-symptoms:', error);
    return new Response(
      JSON.stringify({ 
        symptoms: [], 
        tokens: [],
        error: 'Processing failed' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});