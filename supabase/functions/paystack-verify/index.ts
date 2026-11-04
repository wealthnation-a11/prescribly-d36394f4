import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const requestSchema = z.object({
  reference: z.string().min(1).max(500),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only the paying account may verify and record its own payment.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ status: false, message: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ status: false, message: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ status: false, message: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { reference } = validation.data;

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!paystackSecret) {
      throw new Error('Paystack secret not configured');
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
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

    const metadata = data.data.metadata || {};
    // Payments always settle against the verified caller's account.
    const user_id = user.id;
    const type = metadata.type;
    const plan = metadata.plan;
    const cart_items = metadata.cart_items;
    const shipping_info = metadata.shipping_info;
    const practitioner_id = metadata.practitioner_id;
    const amount = metadata.base_usd_amount || (data.data.amount / 100);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency: skip if this reference was already recorded.
    const { data: existingPayment } = await supabase
      .from('consultation_payments')
      .select('id')
      .eq('payment_reference', reference)
      .maybeSingle();

    if (type === 'subscription') {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('payment_reference', reference)
        .maybeSingle();
      if (existingSub || existingPayment) {
        return new Response(
          JSON.stringify({ status: true, message: 'Payment verified successfully', data: { amount, type, plan } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } else if (existingPayment) {
      return new Response(
        JSON.stringify({ status: true, message: 'Payment verified successfully', data: { amount, type, plan } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (type === 'subscription') {
      const startedAt = new Date();
      const expiresAt = new Date();
      if (plan === 'yearly') { expiresAt.setFullYear(startedAt.getFullYear() + 1); }
      else { expiresAt.setDate(startedAt.getDate() + 30); }

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id, status: 'active', plan,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          authorization_code: data.data.authorization?.authorization_code || null,
          subscription_code: data.data.subscription_code || null,
        });
      if (subError) throw subError;
    } else if (type === 'consultation') {
      const { error: consultationError } = await supabase
        .from('consultation_payments')
        .insert({
          patient_id: user_id, amount, reference,
          status: 'completed',
          currency: metadata.currency || 'NGN',
          local_amount: metadata.local_amount || (data.data.amount / 100),
          exchange_rate_used: metadata.exchange_rate_used, payment_method: 'paystack'
        });
      if (consultationError) throw consultationError;
    } else {
      // Orders (legacy) are no longer supported.
      throw new Error('Unsupported payment type');
    }

    return new Response(
      JSON.stringify({ status: true, message: 'Payment verified successfully', data: { amount, type, plan } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Paystack verify error:', error);
    return new Response(
      JSON.stringify({ status: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
