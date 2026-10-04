import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const PRICE = 4500
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('init'), scan_id: z.string().uuid() }),
  z.object({ action: z.literal('verify'), scan_id: z.string().uuid(), transaction_id: z.union([z.string(), z.number()]).transform(String) }),
])
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'Unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) return json({ error: 'Invalid input' }, 400)
    const body = parsed.data
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: scan } = await admin.from('medical_result_scans').select('id,user_id,status').eq('id', body.scan_id).maybeSingle()
    if (!scan || scan.user_id !== user.id) return json({ error: 'Not found' }, 404)
    if (scan.status === 'paid') return json({ status: 'paid' })
    if (scan.status !== 'unpaid') return json({ error: 'This result is not ready for payment' }, 400)

    const secret = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
    if (!secret) return json({ error: 'Payment provider not configured' }, 500)

    if (body.action === 'init') {
      const o = req.headers.get('origin') || ''
      const origin = /^https?:\/\//.test(o) ? o : 'https://prescribly.lovable.app'
      const tx_ref = `flw-scan-${scan.id}-${Date.now()}`
      const r = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref, amount: PRICE, currency: 'NGN',
          payment_options: 'card,account,ussd,banktransfer',
          redirect_url: `${origin}/scan-results/${scan.id}`,
          customer: { email: user.email, name: user.user_metadata?.first_name || user.email },
          customizations: { title: 'Prescribly Lab Result Interpretation', logo: 'https://prescribly.lovable.app/prescribly-logo.png' },
          meta: { user_id: user.id, type: 'scan', scan_id: scan.id },
        }),
      })
      const d = await r.json()
      if (d.status !== 'success') return json({ error: d.message || 'Could not start payment' }, 400)
      return json({ link: d.data.link, tx_ref })
    }

    const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(body.transaction_id)}/verify`, {
      headers: { Authorization: `Bearer ${secret}` },
    })
    const d = await r.json()
    const tx = d.data
    const ok = d.status === 'success' && ['successful', 'completed'].includes(tx?.status)
      && tx?.currency === 'NGN' && Number(tx?.amount) >= PRICE
      && tx?.meta?.scan_id === scan.id && (!tx?.meta?.user_id || tx.meta.user_id === user.id)
    if (!ok) return json({ error: 'Payment could not be confirmed' }, 400)

    const { data: dup } = await admin.from('medical_result_scans').select('id').eq('payment_reference', tx.tx_ref).neq('id', scan.id).maybeSingle()
    if (dup) return json({ error: 'Payment already used' }, 400)

    await admin.from('medical_result_scans').update({
      status: 'paid', payment_reference: tx.tx_ref, paid_at: new Date().toISOString(), amount: Number(tx.amount),
    }).eq('id', scan.id)
    return json({ status: 'paid' })
  } catch (e) {
    console.error(e)
    return json({ error: 'Something went wrong' }, 500)
  }
})
