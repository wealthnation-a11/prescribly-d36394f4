import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedCondition {
  condition_id: number;
  name: string;
  alias: string;
  confidence: number;
  source: string;
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

    const { text, locale, session_id } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ matched_conditions: [], confidence: 0, route: 'guided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing symptoms from text:', text);

    // Normalize input text
    const normalizedText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim();
    
    const tokens = normalizedText.split(/\s+/).filter(t => t.length > 2);

    // 1) Direct condition name matches
    const { data: directConditions } = await supabase
      .from('conditions')
      .select('id, name')
      .or(tokens.map(token => `name.ilike.%${token}%`).join(','))
      .limit(20);

    // 2) Alias matches with fuzzy search
    const { data: aliasMatches } = await supabase
      .from('conditions_aliases')
      .select('condition_id, aliases')
      .or(tokens.map(token => `aliases.ilike.%${token}%`).join(','))
      .limit(20);

    const matchedConditions: ParsedCondition[] = [];
    
    // Process direct condition matches
    if (directConditions) {
      for (const condition of directConditions) {
        let score = 0;
        const conditionName = condition.name.toLowerCase();
        
        // Exact name match
        if (normalizedText.includes(conditionName)) {
          score += 80;
        }
        
        // Token matches
        tokens.forEach(token => {
          if (conditionName.includes(token)) {
            score += 30;
          }
        });

        if (score > 0) {
          matchedConditions.push({
            condition_id: condition.id,
            name: condition.name,
            alias: condition.name,
            confidence: Math.min(95, score),
            source: 'direct'
          });
        }
      }
    }

    // Process alias matches
    if (aliasMatches) {
      for (const alias of aliasMatches) {
        let score = 0;
        const aliasText = alias.aliases?.toLowerCase() || '';
        
        // Direct alias match
        if (normalizedText.includes(aliasText)) {
          score += 70;
        }
        
        // Token matches
        tokens.forEach(token => {
          if (aliasText.includes(token) && token.length > 2) {
            score += 25;
          }
        });
        
        // Partial matches
        tokens.forEach(token => {
          if (token.length > 3 && aliasText.includes(token.substring(0, token.length - 1))) {
            score += 15;
          }
        });

        if (score > 0) {
          // Get condition name
          const { data: conditionData } = await supabase
            .from('conditions')
            .select('name')
            .eq('id', alias.condition_id)
            .single();

          matchedConditions.push({
            condition_id: alias.condition_id,
            name: conditionData?.name || 'Unknown',
            alias: alias.aliases,
            confidence: Math.min(95, score),
            source: 'alias'
          });
        }
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueMatches = Array.from(
      new Map(matchedConditions.map(item => [item.condition_id, item])).values()
    ).sort((a, b) => b.confidence - a.confidence).slice(0, 10);

    // Calculate overall confidence and routing
    const overallConfidence = uniqueMatches.length > 0 ? 
      Math.min(0.95, 0.4 + Math.min(0.5, uniqueMatches.length * 0.05)) : 0;
    
    const route = overallConfidence > 0.45 ? 'diagnose' : 'guided';

    // Save session if provided
    if (session_id) {
      await supabase.from('user_sessions').upsert({
        id: session_id,
        path: 'freeText',
        payload: { text, candidates: uniqueMatches, confidence: overallConfidence },
        updated_at: new Date().toISOString()
      });
    }

    console.log(`Found ${uniqueMatches.length} matches with confidence ${overallConfidence.toFixed(2)}`);

    return new Response(
      JSON.stringify({ 
        matched_conditions: uniqueMatches, 
        confidence: overallConfidence,
        route: route
      }),
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