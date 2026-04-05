import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const verifySchema = z.object({
  transaction_id: z.union([z.string(), z.number()]).transform(String),
  tx_ref: z.string().optional(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const validation = verifySchema.safeParse(body)
    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: validation.error.errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { transaction_id } = validation.data

    const flutterwaveSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
    if (!flutterwaveSecret) {
      throw new Error('Payment provider not configured')
    }

    console.log('Verifying Flutterwave transaction:', transaction_id)

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${flutterwaveSecret}`,
      },
    })

    const data = await response.json()
    console.log('Flutterwave verify response:', data.status, data.data?.status)

    if (data.status !== 'success' || data.data?.status !== 'successful') {
      return new Response(JSON.stringify({
        status: false,
        message: 'Payment not successful',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const txData = data.data
    const meta = txData.meta || {}
    const type = meta.type || 'subscription'
    const plan = meta.plan || 'monthly'
    const appointmentId = meta.appointment_id

    if (type === 'subscription') {
      const now = new Date()
      const expiresAt = new Date(now)
      if (plan === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      // Upsert subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan,
          status: 'active',
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_reference: txData.tx_ref,
          amount: txData.amount,
          currency: txData.currency,
        }, { onConflict: 'user_id' })

      if (subError) {
        console.error('Subscription upsert error:', subError)
      }
    } else if (type === 'consultation' && appointmentId) {
      // Get doctor_id from appointment
      const { data: appointment } = await supabase
        .from('appointments')
        .select('doctor_id')
        .eq('id', appointmentId)
        .single()

      if (appointment) {
        const { error: cpError } = await supabase
          .from('consultation_payments')
          .insert({
            patient_id: user.id,
            doctor_id: appointment.doctor_id,
            appointment_id: appointmentId,
            amount: txData.amount,
            currency: txData.currency,
            payment_reference: txData.tx_ref,
            status: 'completed',
            payment_method: 'flutterwave',
          })

        if (cpError) console.error('Consultation payment insert error:', cpError)

        // Update appointment payment status
        await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            payment_reference: txData.tx_ref,
            payment_amount: txData.amount,
          })
          .eq('id', appointmentId)
      }
    }

    return new Response(JSON.stringify({
      status: true,
      data: { type, plan, amount: txData.amount, currency: txData.currency },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Flutterwave verify error:', error)
    return new Response(JSON.stringify({
      status: false,
      message: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
