import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log('Sending push notification to:', subscription.endpoint);
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.json();
    const validation = requestSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, title, body, url, type } = validation.data;

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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
