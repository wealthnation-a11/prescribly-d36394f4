import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET');
    if (!paystackSecret) {
      throw new Error('Paystack secret not configured');
    }

    // Get subscriptions expiring in next 3 days or already expired with saved authorization
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: expiringSubscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, payments(authorization_code)')
      .eq('status', 'active')
      .lte('expires_at', threeDaysFromNow.toISOString())
      .not('payments.authorization_code', 'is', null);

    if (subError) throw subError;

    console.log(`Found ${expiringSubscriptions?.length || 0} subscriptions to renew`);

    const results = [];

    for (const subscription of expiringSubscriptions || []) {
      try {
        // Get the authorization code from the last payment
        const authCode = subscription.payments?.[0]?.authorization_code;
        if (!authCode) {
          console.log(`No authorization code for subscription ${subscription.id}`);
          continue;
        }

        // Calculate amount based on plan
        const amount = subscription.plan === 'yearly' ? 10000 : 1000; // $100 or $10 in cents

        // Charge the saved card using Paystack
        const chargeResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorization_code: authCode,
            email: subscription.user_id, // Need to get email from profiles
            amount: amount,
            metadata: {
              user_id: subscription.user_id,
              type: 'subscription_renewal',
              plan: subscription.plan,
              previous_subscription_id: subscription.id
            }
          })
        });

        const chargeData = await chargeResponse.json();

        if (chargeData.status && chargeData.data.status === 'success') {
          // Create new payment record
          await supabaseAdmin
            .from('payments')
            .insert({
              user_id: subscription.user_id,
              amount: amount / 100,
              currency: 'USD',
              reference: chargeData.data.reference,
              status: 'success',
              provider: 'paystack',
              authorization_code: authCode
            });

          // Extend subscription
          const newExpiryDate = new Date();
          if (subscription.plan === 'yearly') {
            newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
          } else {
            newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
          }

          await supabaseAdmin
            .from('subscriptions')
            .update({
              expires_at: newExpiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

          console.log(`Successfully renewed subscription ${subscription.id}`);
          results.push({ subscription_id: subscription.id, status: 'success' });

          // Send success notification
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: subscription.user_id,
              type: 'subscription_renewed',
              title: 'Subscription Renewed',
              message: `Your ${subscription.plan} subscription has been automatically renewed.`,
              data: { subscription_id: subscription.id }
            });

        } else {
          console.log(`Failed to charge subscription ${subscription.id}:`, chargeData.message);
          results.push({ subscription_id: subscription.id, status: 'failed', error: chargeData.message });

          // Send failure notification
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: subscription.user_id,
              type: 'subscription_payment_failed',
              title: 'Subscription Payment Failed',
              message: 'We couldn\'t renew your subscription. Please update your payment method.',
              data: { subscription_id: subscription.id }
            });

          // Mark subscription as expired if payment fails
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', subscription.id);
        }

      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error);
        results.push({ subscription_id: subscription.id, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        status: true,
        processed: results.length,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Charge recurring error:', error);
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});