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
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text input required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Parsing symptoms for text:', text);

    // Normalize input text
    const normalizedText = text.toLowerCase().trim();
    const tokens = normalizedText.split(/\s+/);
    
    const parsedSymptoms: ParsedSymptom[] = [];

    // Direct symptom matching
    const { data: symptoms, error: symptomsError } = await supabase
      .from('symptoms')
      .select('id, name, description')
      .limit(100);

    if (symptomsError) {
      console.error('Error fetching symptoms:', symptomsError);
      throw symptomsError;
    }

    // Match symptoms by name and aliases
    for (const symptom of symptoms || []) {
      const symptomName = symptom.name.toLowerCase();
      let score = 0;

      // Exact match
      if (normalizedText.includes(symptomName)) {
        score = 1.0;
      } else {
        // Fuzzy matching - check for partial matches
        const symptomTokens = symptomName.split(/\s+/);
        let matchCount = 0;
        
        for (const token of tokens) {
          for (const symptomToken of symptomTokens) {
            if (token.includes(symptomToken) || symptomToken.includes(token)) {
              matchCount++;
              break;
            }
          }
        }
        
        if (matchCount > 0) {
          score = matchCount / Math.max(tokens.length, symptomTokens.length);
        }
      }

      if (score > 0.3) { // Threshold for relevance
        parsedSymptoms.push({
          id: symptom.id,
          name: symptom.name,
          score: Math.round(score * 100) / 100
        });
      }
    }

    // Check condition aliases for additional matches
    const { data: aliases, error: aliasError } = await supabase
      .from('condition_aliases')
      .select('id, condition_id, alias')
      .limit(200);

    if (!aliasError && aliases) {
      for (const alias of aliases) {
        const aliasName = alias.alias.toLowerCase();
        let score = 0;

        if (normalizedText.includes(aliasName)) {
          score = 0.8; // High score for condition alias matches
          
          // Find related symptoms for this condition
          const { data: conditionSymptoms } = await supabase
            .from('condition_symptoms')
            .select('symptom_id, symptoms(id, name)')
            .eq('condition_id', alias.condition_id)
            .limit(3);

          if (conditionSymptoms) {
            for (const cs of conditionSymptoms) {
              if (cs.symptoms) {
                const existingIndex = parsedSymptoms.findIndex(ps => ps.id === cs.symptoms.id);
                if (existingIndex === -1) {
                  parsedSymptoms.push({
                    id: cs.symptoms.id,
                    name: cs.symptoms.name,
                    score: score * 0.7 // Slightly lower score for inferred symptoms
                  });
                } else {
                  // Boost existing symptom score
                  parsedSymptoms[existingIndex].score = Math.min(1.0, parsedSymptoms[existingIndex].score + 0.2);
                }
              }
            }
          }
        }
      }
    }

    // Sort by score and remove duplicates
    const uniqueSymptoms = parsedSymptoms
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10 symptoms

    console.log(`Found ${uniqueSymptoms.length} symptoms for input: ${text}`);

    return new Response(
      JSON.stringify({ symptoms: uniqueSymptoms }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-symptoms:', error);
    return new Response(
      JSON.stringify({ error: 'Processing failed', symptoms: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});