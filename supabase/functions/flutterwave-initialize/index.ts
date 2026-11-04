import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Server-side price list — the client never decides what a service costs.
const BASE_FEE_USD = 7
const CONSULTATION_NGN = 3500
const YEARLY_FACTOR = 10 // yearly = 10x monthly (2 months free)

// Payment return destinations are restricted to the app's own origins.
const ALLOWED_HOST_SUFFIXES = ['prescriblycare.lovable.app', 'lovable.app']
const ALLOWED_LOCAL_ORIGINS = [
  'http://localhost:8080', 'https://localhost:8080',
  'http://localhost:5173', 'https://localhost:5173',
  'http://localhost', 'capacitor://localhost', 'ionic://localhost',
]
const DEFAULT_ORIGIN = 'https://prescriblycare.lovable.app'

function allowedOrigin(raw: string | null): string {
  const o = raw || ''
  if (!/^https?:\/\//.test(o) && !/^capacitor:\/\//.test(o)) return DEFAULT_ORIGIN
  try {
    const host = new URL(o).host
    if (ALLOWED_LOCAL_ORIGINS.includes(o.replace(/\/$/, ''))) return o
    if (ALLOWED_HOST_SUFFIXES.some(s => host === s || host.endsWith('.' + s))) return o
  } catch { /* fall through */ }
  return DEFAULT_ORIGIN
}

const paymentSchema = z.object({
  email: z.string().email().max(255),
  amount: z.number().positive().max(1000000),
  type: z.enum(['subscription', 'consultation']),
  plan: z.enum(['monthly', 'yearly']).optional(),
  currency: z.string().length(3).optional(),
  appointment_id: z.string().uuid().optional(),
  metadata: z.any().optional(),
})

function expectedAmount(
  supabase: ReturnType<typeof createClient>,
  type: 'subscription' | 'consultation',
  plan: string | undefined,
  currency: string,
  rate: number
): number {
  if (type === 'consultation') {
    return currency === 'NGN' ? CONSULTATION_NGN : Math.round(BASE_FEE_USD / rate)
  }
  const baseUSD = plan === 'yearly' ? BASE_FEE_USD * YEARLY_FACTOR : BASE_FEE_USD
  return Math.round(baseUSD / rate)
}

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

    // Resolve the exchange rate for the requested currency and verify the price server-side.
    const { data: rateRow } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('target_currency', currency)
      .eq('base_currency', 'USD')
      .maybeSingle()
    const rate = rateRow?.rate && rateRow.rate > 0 ? rateRow.rate : 1
    const expected = expectedAmount(supabase, type, plan, currency, rate)
    const tolerance = Math.max(expected * 0.02, 1)
    if (Math.abs(amount - expected) > tolerance) {
      return new Response(JSON.stringify({
        error: 'Invalid amount for this payment type',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tx_ref = `flw-${type}-${user.id}-${Date.now()}`

    // Caller metadata cannot override the payer identity or the payment type.
    const safeExtra = (extraMetadata && typeof extraMetadata === 'object')
      ? Object.fromEntries(Object.entries(extraMetadata).filter(([k]) => !['user_id', 'type', 'plan'].includes(k)))
      : {}

    const paymentPayload: Record<string, unknown> = {
      tx_ref,
      amount,
      currency,
      // Enable all major Flutterwave payment options so users can choose their method
      payment_options: 'card,account,ussd,banktransfer,mobilemoneyghana,mobilemoneyuganda,mpesa,qr,credit',
      redirect_url: `${allowedOrigin(req.headers.get('origin'))}/payment-callback`,
      customer: {
        email,
        name: user.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : email,
      },
      customizations: {
        title: type === 'subscription' ? 'PrescriblyCare Subscription' : 'Appointment Booking Fee',
        logo: 'https://prescriblycare.lovable.app/__l5e/assets-v1/abc4acb3-95f1-46d4-a47a-859a56b565e2/prescriblycare-header-logo.png',
      },
      meta: {
        ...safeExtra,
        user_id: user.id,
        type,
        plan: plan || '',
        appointment_id: appointment_id || '',
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
      console.error('Flutterwave error:', data.message)
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
