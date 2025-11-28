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

    // Get subscriptions expiring in 7 days, 3 days, and 1 day
    const reminderPeriods = [7, 3, 1];
    const notifications = [];

    for (const days of reminderPeriods) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const { data: expiringSubscriptions, error } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan, expires_at')
        .eq('status', 'active')
        .gte('expires_at', targetDate.toISOString())
        .lt('expires_at', nextDay.toISOString());

      if (error) throw error;

      console.log(`Found ${expiringSubscriptions?.length || 0} subscriptions expiring in ${days} days`);

      for (const subscription of expiringSubscriptions || []) {
        // Check if we already sent this reminder
        const { data: existingReminder } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', subscription.user_id)
          .eq('type', 'subscription_expiring')
          .eq('data->>subscription_id', subscription.id)
          .eq('data->>days_remaining', days.toString())
          .single();

        if (existingReminder) {
          console.log(`Reminder already sent for subscription ${subscription.id}`);
          continue;
        }

        // Send reminder notification
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: subscription.user_id,
            type: 'subscription_expiring',
            title: `Subscription Expiring Soon`,
            message: `Your ${subscription.plan} subscription will expire in ${days} day${days > 1 ? 's' : ''}. It will be automatically renewed.`,
            data: {
              subscription_id: subscription.id,
              days_remaining: days,
              expires_at: subscription.expires_at
            }
          });

        if (!notifError) {
          notifications.push({
            subscription_id: subscription.id,
            days_remaining: days,
            status: 'sent'
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: true,
        reminders_sent: notifications.length,
        notifications
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Subscription reminders error:', error);
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