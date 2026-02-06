import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  text: z.string().min(1).max(10000),
  locale: z.string().max(10).default('en'),
});

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

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, locale } = validation.data;
    console.log('Parsing symptoms for text:', text);

    const normalizedText = text.toLowerCase().trim();
    const tokens = normalizedText.split(/\s+/);
    const parsedSymptoms: ParsedSymptom[] = [];

    const { data: symptoms, error: symptomsError } = await supabase
      .from('symptoms')
      .select('id, name, description')
      .limit(100);

    if (symptomsError) {
      console.error('Error fetching symptoms:', symptomsError);
      throw symptomsError;
    }

    for (const symptom of symptoms || []) {
      const symptomName = symptom.name.toLowerCase();
      let score = 0;

      if (normalizedText.includes(symptomName)) {
        score = 1.0;
      } else {
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

      if (score > 0.3) {
        parsedSymptoms.push({ id: symptom.id, name: symptom.name, score: Math.round(score * 100) / 100 });
      }
    }

    const { data: aliases, error: aliasError } = await supabase
      .from('condition_aliases')
      .select('id, condition_id, alias')
      .limit(200);

    if (!aliasError && aliases) {
      for (const alias of aliases) {
        const aliasName = alias.alias.toLowerCase();
        if (normalizedText.includes(aliasName)) {
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
                  parsedSymptoms.push({ id: cs.symptoms.id, name: cs.symptoms.name, score: 0.56 });
                } else {
                  parsedSymptoms[existingIndex].score = Math.min(1.0, parsedSymptoms[existingIndex].score + 0.2);
                }
              }
            }
          }
        }
      }
    }

    const uniqueSymptoms = parsedSymptoms
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    console.log(`Found ${uniqueSymptoms.length} symptoms for input: ${text}`);

    return new Response(
      JSON.stringify({ symptoms: uniqueSymptoms }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-symptoms:', error);
    return new Response(
      JSON.stringify({ error: 'Processing failed', symptoms: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
