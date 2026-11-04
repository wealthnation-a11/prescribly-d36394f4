import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Resolve the caller: either the platform service or a signed-in user.
async function getCaller(req: Request): Promise<{ userId: string | null; isService: boolean }> {
  const auth = req.headers.get('Authorization') ?? '';
  if (SERVICE_KEY && auth === `Bearer ${SERVICE_KEY}`) return { userId: null, isService: true };
  if (!auth) return { userId: null, isService: false };
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data } = await client.auth.getUser();
  return { userId: data?.user?.id ?? null, isService: false };
}

const requestSchema = z.object({
  input_text: z.string().max(10000).optional().nullable(),
  parsed_symptoms: z.unknown().optional().nullable(),
  suggested_conditions: z.unknown().optional().nullable(),
  confirmed_condition: z.string().max(500).optional().nullable(),
  drug: z.string().max(500).optional().nullable(),
  dosage: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, isService } = await getCaller(req);
    if (!isService && !userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // History is always written under the caller's own identity.
    const user_id = userId;
    const { input_text, parsed_symptoms, suggested_conditions, confirmed_condition, drug, dosage, notes } = validation.data;

    const { data, error } = await supabase
      .from('user_diagnosis_history')
      .insert({ user_id, input_text, parsed_symptoms, suggested_conditions, confirmed_condition, drug, dosage, notes })
      .select()
      .single();

    if (error) {
      console.error('Error logging history:', error.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-history:', error);
    return new Response(
      JSON.stringify({ error: 'Processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
