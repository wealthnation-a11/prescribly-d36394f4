import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const paymentSchema = z.object({
  email: z.string().email().max(255),
  amount: z.number().positive().max(1000000),
  type: z.enum(['subscription', 'consultation', 'order']),
  plan: z.enum(['monthly', 'yearly']).optional(),
  currency: z.string().length(3).optional(),
  appointment_id: z.string().uuid().optional(),
  metadata: z.any().optional(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()

    const validation = paymentSchema.safeParse(body)
    if (!validation.success) {
      return new Response(JSON.stringify({
        error: 'Invalid input',
        details: validation.error.errors,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, amount, type, plan, currency = 'USD', appointment_id, metadata: extraMetadata } = validation.data

    const flutterwaveSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
    if (!flutterwaveSecret) {
      console.error('FLUTTERWAVE_SECRET_KEY not configured')
      throw new Error('Payment provider not configured')
    }

    const tx_ref = `flw-${type}-${user.id}-${Date.now()}`

    const paymentPayload: Record<string, unknown> = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${req.headers.get('origin')}/payment-callback`,
      customer: {
        email,
        name: user.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : email,
      },
      customizations: {
        title: type === 'subscription' ? 'Prescribly Subscription' : type === 'consultation' ? 'Consultation Fee' : 'Order Payment',
        logo: 'https://prescribly.lovable.app/favicon.ico',
      },
      meta: {
        user_id: user.id,
        type,
        plan: plan || '',
        appointment_id: appointment_id || '',
        ...(extraMetadata || {}),
      },
    }

    console.log('Initializing Flutterwave payment:', { tx_ref, amount, currency, type })

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${flutterwaveSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    })

    const data = await response.json()
    console.log('Flutterwave response status:', data.status)

    if (data.status !== 'success') {
      console.error('Flutterwave error:', data)
      throw new Error(data.message || 'Payment initialization failed')
    }

    return new Response(
      JSON.stringify({
        status: true,
        authorization_url: data.data.link,
        tx_ref,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Flutterwave initialize error:', error)
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
