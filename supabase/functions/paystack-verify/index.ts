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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, type, plan, base_usd_amount, currency, local_amount, exchange_rate_used, cart_items, shipping_info, practitioner_id } = data.data.metadata;
    const amount = base_usd_amount || (data.data.amount / 100);

    // Insert payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id, amount, reference,
        status: 'completed',
        currency: currency || 'NGN',
        local_amount: local_amount || (data.data.amount / 100),
        exchange_rate_used, provider: 'paystack'
      });

    if (paymentError) throw paymentError;

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
          user_id, amount, reference,
          status: 'completed',
          currency: currency || 'NGN',
          local_amount: local_amount || (data.data.amount / 100),
          exchange_rate_used, provider: 'paystack'
        });
      if (consultationError) throw consultationError;
    } else if (type === 'order') {
      const adminCommission = amount * 0.10;
      const practitionerEarnings = amount * 0.90;
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id, practitioner_id, total_amount: amount,
          admin_commission: adminCommission,
          practitioner_earnings: practitionerEarnings,
          items: cart_items, shipping_address: shipping_info,
          payment_reference: reference, status: 'pending',
        });
      if (orderError) throw orderError;
      await supabase.from('shopping_cart').delete().eq('user_id', user_id);
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
