import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
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
  userId: z.string().uuid(),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(5000),
  url: z.string().max(2000).optional(),
  type: z.string().max(100).optional(),
});

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendPushNotification(subscription: PushSubscription, payload: any): Promise<boolean> {
  try {
    console.log('Sending push notification to device endpoint');
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId: callerId, isService } = await getCaller(req);
    if (!isService && !callerId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const rawBody = await req.json();
    const validation = requestSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, title, body, url, type } = validation.data;

    // Signed-in callers may only push to themselves; the platform service may target anyone.
    if (!isService && userId !== callerId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: cannot send push notifications for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await Promise.all(
      subscriptions.map(sub =>
        sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body, url, type }
        )
      )
    );

    const successCount = results.filter(r => r).length;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: type || 'info',
      title,
      message: body,
      data: { url }
    });

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
