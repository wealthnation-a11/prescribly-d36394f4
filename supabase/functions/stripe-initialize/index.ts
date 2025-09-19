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
    console.log('Starting Stripe payment initialization...');
    
    const { 
      email, 
      amount, 
      currency = 'USD',
      user_id, 
      type, 
      plan,
      appointment_id,
      base_usd_amount,
      exchange_rate_used
    } = await req.json();

    console.log('Stripe initialization request:', { 
      email, 
      amount, 
      currency,
      type, 
      plan,
      base_usd_amount 
    });

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

    // Create Stripe checkout session
    const stripeUrl = 'https://api.stripe.com/v1/checkout/sessions';
    
    const metadata: Record<string, string> = {
      user_id: user_id,
      type: type,
      currency: currency,
      base_usd_amount: base_usd_amount?.toString() || amount.toString(),
      exchange_rate_used: exchange_rate_used?.toString() || '1'
    };

    if (plan) metadata.plan = plan;
    if (appointment_id) metadata.appointment_id = appointment_id;

    const lineItems = [{
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: type === 'subscription' 
            ? `Prescribly ${plan?.charAt(0).toUpperCase() + plan?.slice(1)} Subscription`
            : 'Medical Consultation',
          description: type === 'subscription'
            ? `${plan === 'yearly' ? 'Annual' : 'Monthly'} access to all premium features`
            : 'Professional medical consultation with licensed doctor'
        },
        unit_amount: amount, // Amount in cents/smallest currency unit
      },
      quantity: 1,
    }];

    const sessionData = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': lineItems[0].price_data.product_data.name,
      'line_items[0][price_data][unit_amount]': amount.toString(),
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovable.app')}/payment/success?session_id={CHECKOUT_SESSION_ID}&provider=stripe`,
      'cancel_url': `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovable.app')}/subscription`,
      'customer_email': email,
    });

    // Add metadata
    Object.entries(metadata).forEach(([key, value], index) => {
      sessionData.append(`metadata[${key}]`, value);
    });

    const stripeResponse = await fetch(stripeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionData,
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text();
      console.error('Stripe API error:', errorData);
      throw new Error(`Stripe API error: ${stripeResponse.status}`);
    }

    const session = await stripeResponse.json();
    console.log('Stripe session created:', session.id);

    // Store payment record
    const { error: dbError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user_id,
        amount: base_usd_amount || (amount / 100), // Store USD equivalent
        reference: session.id,
        status: 'pending'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't throw here, payment can still proceed
    }

    return new Response(
      JSON.stringify({
        status: true,
        message: 'Payment initialized successfully',
        authorization_url: session.url,
        session_id: session.id,
        provider: 'stripe'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in stripe-initialize function:', error);
    
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message || 'Payment initialization failed'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});