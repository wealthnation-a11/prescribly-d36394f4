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
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  user_id: z.string().uuid().optional(),
  data: z.record(z.unknown()).optional(),
  diagnosis_session_id: z.string().uuid().optional().nullable(),
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

    const { type, title, message, data, diagnosis_session_id } = validation.data;

    // Who may be notified:
    // - the platform service may notify anyone (internal flows);
    // - a signed-in user may notify only themselves, unless they are an approved doctor or an admin.
    let targetUserId = userId;
    if (isService) {
      targetUserId = validation.data.user_id ?? null;
    } else if (validation.data.user_id && validation.data.user_id !== userId) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', userId).maybeSingle();
      const isDoctor = profile?.role === 'doctor' ? await supabase.rpc('is_approved_doctor', { _user_id: userId }) : false;
      const isAdmin = profile?.role === 'admin' ? await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }) : false;
      if (!isDoctor && !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: cannot create notifications for another user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUserId = validation.data.user_id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Target user is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId, type, title, message,
        data: data || {},
        diagnosis_session_id,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, notification_id: notification.id, message: 'Notification created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
