import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Stripe payment verification...');
    
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Session ID is required');
    }

    console.log('Stripe verification request for session:', session_id);

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Retrieve the session from Stripe
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text();
      console.error('Stripe API error:', errorData);
      throw new Error(`Stripe API error: ${stripeResponse.status}`);
    }

    const session = await stripeResponse.json();
    console.log('Stripe session retrieved:', session.id, session.payment_status);

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const metadata = session.metadata;
    const user_id = metadata.user_id;
    const type = metadata.type;
    const plan = metadata.plan;
    const appointment_id = metadata.appointment_id;
    const currency = metadata.currency;
    const base_usd_amount = parseFloat(metadata.base_usd_amount || '0');

    console.log('Processing payment for:', { user_id, type, plan, currency, base_usd_amount });

    // Update payment record
    const { error: paymentError } = await supabaseClient
      .from('payments')
      .update({ status: 'completed' })
      .eq('reference', session_id);

    if (paymentError) {
      console.error('Error updating payment record:', paymentError);
    }

    // Handle subscription
    if (type === 'subscription' && plan) {
      const durationMonths = plan === 'yearly' ? 12 : 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      const { error: subError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user_id,
          status: 'active',
          plan: plan,
          expires_at: expiresAt.toISOString(),
          started_at: new Date().toISOString()
        });

      if (subError) {
        console.error('Error updating subscription:', subError);
        throw subError;
      }

      console.log('Subscription updated successfully');
    }

    // Handle consultation payment
    if (type === 'consultation' && appointment_id) {
      const { error: consultError } = await supabaseClient
        .from('consultation_payments')
        .insert({
          user_id: user_id,
          appointment_id: appointment_id,
          amount: base_usd_amount,
          reference: session_id,
          status: 'completed'
        });

      if (consultError) {
        console.error('Error recording consultation payment:', consultError);
        throw consultError;
      }

      console.log('Consultation payment recorded successfully');
    }

    return new Response(
      JSON.stringify({
        status: true,
        message: 'Payment verified successfully',
        data: {
          type: type,
          plan: plan,
          user_id: user_id,
          amount: base_usd_amount,
          currency: currency
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in stripe-verify function:', error);
    
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message || 'Payment verification failed'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});