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
  diagnosis_id: z.string().uuid(),
  actor_id: z.string().uuid().optional(),
  action: z.string().min(1).max(200),
  details: z.record(z.unknown()).optional(),
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

    const { diagnosis_id, action, details } = validation.data;
    // The recorded actor is the verified caller; platform-service callers must supply it.
    const actor_id = userId ?? validation.data.actor_id ?? null;
    if (!actor_id) {
      return new Response(
        JSON.stringify({ error: 'Actor is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: auditLog, error } = await supabase
      .from('audit_logs')
      .insert({
        diagnosis_id,
        actor_id,
        action,
        details: details || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating audit log:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create audit log' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, audit_log_id: auditLog.id, message: 'Audit log created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-audit-log:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
