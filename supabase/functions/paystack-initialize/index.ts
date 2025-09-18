import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, amount, user_id, type, plan } = await req.json();
    
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET');
    if (!paystackSecret) {
      throw new Error('Paystack secret not configured');
    }

    // Initialize transaction with Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo/cents
        currency: 'NGN',
        metadata: {
          user_id,
          type,
          plan: plan || 'monthly'
        },
        callback_url: `${req.headers.get('origin')}/payment-callback`
      })
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Payment initialization failed');
    }

    return new Response(
      JSON.stringify({
        status: true,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Paystack initialize error:', error);
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