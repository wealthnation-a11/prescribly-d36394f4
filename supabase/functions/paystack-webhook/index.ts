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

    const data = event.data;
    const metadata = data.metadata || {};
    const amount = data.amount ? data.amount / 100 : 0;
    const reference = data.reference;

    // Handle different event types
    if (event.event === 'charge.success') {
      // Insert payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: metadata.user_id,
          amount: amount,
          currency: metadata.currency || 'USD',
          reference: reference,
          status: 'success',
          provider: 'paystack',
          authorization_code: data.authorization?.authorization_code || null,
          subscription_code: data.authorization?.subscription_code || null
        });

      if (paymentError) {
        console.error('Error inserting payment:', paymentError);
        throw paymentError;
      }

      // Handle subscription payment
      if (metadata.type === 'subscription') {
        const expiryDate = new Date();
        if (metadata.plan === 'yearly') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: metadata.user_id,
            plan: metadata.plan || 'monthly',
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiryDate.toISOString()
          });

        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
          throw subscriptionError;
        }

        // Send success notification
        await supabase
          .from('notifications')
          .insert({
            user_id: metadata.user_id,
            type: 'subscription_activated',
            title: 'Subscription Activated',
            message: `Your ${metadata.plan} subscription is now active!`,
            data: { plan: metadata.plan, reference }
          });
      }
      
      // Handle consultation payment
      if (metadata.type === 'consultation' && metadata.appointment_id) {
        const { error: consultationError } = await supabase
          .from('consultation_payments')
          .insert({
            user_id: metadata.user_id,
            appointment_id: metadata.appointment_id,
            amount: amount,
            currency: metadata.currency || 'USD',
            reference: reference,
            status: 'success',
            provider: 'paystack'
          });

        if (consultationError) {
          console.error('Error inserting consultation payment:', consultationError);
          throw consultationError;
        }

        // Update appointment status to scheduled
        await supabase
          .from('appointments')
          .update({ status: 'scheduled' })
          .eq('id', metadata.appointment_id);
      }

      // Handle order payment
      if (metadata.type === 'order' && metadata.cart_items) {
        const cartItems = metadata.cart_items;
        const shippingInfo = metadata.shipping_info;

        // Group items by practitioner
        const itemsByPractitioner = cartItems.reduce((acc: any, item: any) => {
          if (!acc[item.practitioner_id]) {
            acc[item.practitioner_id] = [];
          }
          acc[item.practitioner_id].push(item);
          return acc;
        }, {});

        // Create orders for each practitioner
        for (const [practitionerId, items] of Object.entries(itemsByPractitioner)) {
          const orderItems = items as any[];
          const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const adminCommission = totalAmount * 0.1;
          const practitionerEarnings = totalAmount * 0.9;

          await supabase
            .from('orders')
            .insert({
              user_id: metadata.user_id,
              practitioner_id: practitionerId,
              items: orderItems,
              total_amount: totalAmount,
              admin_commission: adminCommission,
              practitioner_earnings: practitionerEarnings,
              shipping_address: shippingInfo,
              status: 'pending',
              payment_reference: reference
            });
        }

        // Send notification
        await supabase
          .from('notifications')
          .insert({
            user_id: metadata.user_id,
            type: 'order_placed',
            title: 'Order Placed Successfully',
            message: 'Your order has been placed and is being processed.',
            data: { reference }
          });
      }
    }
    
    // Handle subscription renewal charge success
    if (event.event === 'subscription.not_renew') {
      console.log('Subscription set to not renew:', data);
      if (metadata.user_id) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', metadata.user_id);

        await supabase
          .from('notifications')
          .insert({
            user_id: metadata.user_id,
            type: 'subscription_cancelled',
            title: 'Subscription Cancelled',
            message: 'Your subscription has been cancelled and will not renew.',
            data: { reference }
          });
      }
    }
    
    if (event.event === 'subscription.disable') {
      console.log('Subscription disabled:', data);
      if (metadata.user_id) {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', metadata.user_id);
      }
    }
    
    if (event.event === 'invoice.payment_failed') {
      console.log('Payment failed:', data);
      if (metadata.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: metadata.user_id,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: 'Your payment could not be processed. Please update your payment method.',
            data: { reference }
          });
      }
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