import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedCondition {
  id: number;
  name: string;
  alias: string;
  confidence: number;
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

    const { text, locale } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ matched_conditions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing symptoms from text:', text);

    // Normalize input text
    const normalizedText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim();
    
    const tokens = normalizedText.split(/\s+/);

    // Fetch conditions and aliases
    const { data: conditionsAliases, error: aliasError } = await supabase
      .from('conditions_aliases')
      .select('*');

    if (aliasError) {
      console.error('Error fetching condition aliases:', aliasError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const matchedConditions: ParsedCondition[] = [];
    
    // Fuzzy matching against aliases
    conditionsAliases.forEach((conditionAlias: any) => {
      const alias = conditionAlias.aliases?.toLowerCase();
      const symptoms = conditionAlias.symptoms?.toLowerCase() || '';
      
      let score = 0;
      
      // Direct alias match
      if (alias && normalizedText.includes(alias)) {
        score += 50;
      }
      
      // Symptom keywords match
      tokens.forEach((token) => {
        if (alias?.includes(token) && token.length > 2) {
          score += 20;
        }
        if (symptoms.includes(token) && token.length > 2) {
          score += 15;
        }
      });
      
      // Partial word match
      tokens.forEach((token) => {
        if (token.length > 3) {
          if (alias?.includes(token.substring(0, token.length - 1))) {
            score += 10;
          }
        }
      });

      if (score > 0) {
        matchedConditions.push({
          id: conditionAlias.condition_id,
          name: conditionAlias.name,
          alias: conditionAlias.aliases,
          confidence: Math.min(95, score)
        });
      }
    });

    // Sort by confidence and return top 10
    const sortedMatches = matchedConditions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    console.log('Found matches:', sortedMatches.length);

    return new Response(
      JSON.stringify({ matched_conditions: sortedMatches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-symptoms:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});