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
    const { reference } = await req.json();
    
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!paystackSecret) {
      throw new Error('Paystack secret not configured');
    }

    // Verify transaction with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, type, plan } = data.data.metadata;
    const amount = data.data.amount / 100; // Convert from kobo/cents

    // Insert payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id,
        amount,
        reference,
        status: 'completed'
      });

    if (paymentError) throw paymentError;

    if (type === 'subscription') {
      const startedAt = new Date();
      const expiresAt = new Date();
      
      if (plan === 'yearly') {
        expiresAt.setFullYear(startedAt.getFullYear() + 1);
      } else {
        expiresAt.setDate(startedAt.getDate() + 30);
      }

      // Insert/update subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id,
          status: 'active',
          plan,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (subError) throw subError;
    } else if (type === 'consultation') {
      // Insert consultation payment record
      const { error: consultationError } = await supabase
        .from('consultation_payments')
        .insert({
          user_id,
          amount,
          reference,
          status: 'completed'
        });

      if (consultationError) throw consultationError;
    }

    return new Response(
      JSON.stringify({
        status: true,
        message: 'Payment verified successfully',
        data: {
          amount,
          type,
          plan
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Paystack verify error:', error);
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