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
  session_id: z.string().uuid().optional().nullable(),
  path: z.string().max(500).optional().nullable(),
  payload: z.record(z.unknown()).optional().nullable(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, isService } = await getCaller(req);
    if (!userId) {
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

    // Sessions are always stored under the caller's own identity.
    const user_id = userId;
    const { session_id, path, payload } = validation.data;

    if (!session_id) {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({ user_id, path: path || 'entry', payload: payload || {} })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error.message);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, session_id: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update only if the session belongs to the caller; never overwrite another user's row.
      const { data: updated, error } = await supabase
        .from('user_sessions')
        .update({
          path: path || 'entry',
          payload: payload || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', session_id)
        .eq('user_id', user_id)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Error updating session:', error.message);
        return new Response(
          JSON.stringify({ error: 'Failed to update session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!updated) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, session_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in save-session:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
