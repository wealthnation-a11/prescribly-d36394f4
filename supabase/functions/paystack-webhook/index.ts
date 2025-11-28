import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET');
    if (!paystackSecret) {
      throw new Error('Paystack secret not configured');
    }

    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    const hash = createHmac('sha512', paystackSecret)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Webhook event:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'charge.success':
        // Store authorization code for recurring payments
        if (event.data.authorization?.authorization_code) {
          const { user_id, type, plan } = event.data.metadata;
          
          if (type === 'subscription') {
            await supabase
              .from('subscriptions')
              .update({
                authorization_code: event.data.authorization.authorization_code,
                subscription_code: event.data.subscription_code || null
              })
              .eq('user_id', user_id)
              .eq('status', 'active');
          }
        }
        break;

      case 'subscription.create':
        console.log('Subscription created:', event.data);
        break;

      case 'subscription.not_renew':
      case 'subscription.disable':
        // Deactivate subscription
        if (event.data.subscription_code) {
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('subscription_code', event.data.subscription_code);
        }
        break;

      case 'invoice.payment_failed':
        // Handle failed renewal
        console.error('Subscription payment failed:', event.data);
        // TODO: Send notification to user
        break;

      default:
        console.log('Unhandled event:', event.event);
    }

    return new Response(
      JSON.stringify({ status: 'success' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});