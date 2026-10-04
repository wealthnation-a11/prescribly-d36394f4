import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const Body = z.object({
  file_path: z.string().min(5).max(500),
  file_name: z.string().max(255).optional(),
})

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const PROMPT = `You are a careful medical lab interpreter for Prescribly (Nigeria). Read the attached lab/medical result and explain it in simple, plain English for a non-medical patient.
Return ONLY a JSON object (no markdown) with this exact shape:
{
 "is_medical_result": boolean,
 "test_type": string,
 "overall_status": "normal" | "mild_concern" | "needs_attention",
 "teaser": string (2 short sentences that say what kind of test it is and how many items were found, WITHOUT revealing any values or conclusions),
 "summary": string (3-5 sentence plain English overview),
 "findings": [ { "name": string, "value": string, "reference_range": string, "status": "normal" | "low" | "high" | "abnormal", "explanation": string } ],
 "next_steps": [string],
 "questions_for_doctor": [string],
 "lifestyle_tips": [string]
}
If the image is not a medical result, set is_medical_result false and leave arrays empty. Never prescribe medication. Keep explanations short and kind.`

async function callAI(apiKey: string, content: Record<string, unknown>[]) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'fetch' },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra',
      input: [{ role: 'user', content }],
      stream: true,
      store: false,
      reasoning: { effort: 'low', summary: 'auto' },
      include: ['reasoning.encrypted_content'],
    }),
  })
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '')
    throw Object.assign(new Error(t || `AI error ${res.status}`), { status: res.status })
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = '', out = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const d = line.slice(5).trim()
      if (!d || d === '[DONE]') continue
      try {
        const ev = JSON.parse(d)
        if (ev.type === 'response.output_text.delta') out += ev.delta ?? ''
        if (ev.type === 'response.failed' || ev.type === 'error') throw new Error(ev.error?.message || 'AI failed')
      } catch (e) { if (e instanceof Error && e.message.includes('AI failed')) throw e }
    }
  }
  return out
}

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
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const { file_path, file_name } = parsed.data
    if (!file_path.startsWith(`${user.id}/scans/`)) return json({ error: 'Invalid file' }, 403)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: scan, error: insErr } = await admin.from('medical_result_scans')
      .insert({ user_id: user.id, file_path, file_name, status: 'processing' }).select('id').single()
    if (insErr) throw insErr

    const fail = async (msg: string, status = 500) => {
      await admin.from('medical_result_scans').update({ status: 'failed', error_message: msg }).eq('id', scan.id)
      return json({ error: msg, scan_id: scan.id }, status)
    }

    const { data: file, error: dlErr } = await admin.storage.from('patient-records').download(file_path)
    if (dlErr || !file) return await fail('Could not read the uploaded file')
    if (file.size > 10 * 1024 * 1024) return await fail('File is larger than 10MB', 400)
    const bytes = new Uint8Array(await file.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const b64 = btoa(bin)
    const mime = file.type || (file_path.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    const filePart = mime === 'application/pdf'
      ? { type: 'input_file', filename: file_name || 'result.pdf', file_data: `data:application/pdf;base64,${b64}` }
      : { type: 'input_image', image_url: `data:${mime};base64,${b64}` }

    let text: string
    try {
      text = await callAI(Deno.env.get('LOVABLE_API_KEY')!, [{ type: 'input_text', text: PROMPT }, filePart])
    } catch (e) {
      const s = (e as any).status
      const msg = s === 402 ? 'AI credits are exhausted. Please try again later.' : s === 429 ? 'Too many requests, please try again in a minute.' : 'Could not analyse this result.'
      console.error('AI error', e)
      return await fail(msg, s && s < 500 ? s : 500)
    }

    let report: any
    try {
      const m = text.match(/\{[\s\S]*\}/)
      report = JSON.parse(m ? m[0] : text)
    } catch {
      return await fail('Could not read the result clearly. Please upload a clearer photo.', 422)
    }
    if (!report.is_medical_result) return await fail('This does not look like a medical result. Please upload a lab report.', 422)

    const findings = Array.isArray(report.findings) ? report.findings : []
    const flagged = findings.filter((f: any) => f.status && f.status !== 'normal').length

    const { data: profile } = await admin.from('profiles').select('is_legacy').eq('user_id', user.id).maybeSingle()
    const free = profile?.is_legacy === true

    await admin.from('medical_result_scans').update({
      status: free ? 'paid' : 'unpaid',
      summary_teaser: String(report.teaser || '').slice(0, 500),
      findings_count: findings.length,
      flagged_count: flagged,
      interpretation_json: report,
      paid_at: free ? new Date().toISOString() : null,
      payment_reference: free ? 'free-access' : null,
      amount: free ? 0 : 4500,
    }).eq('id', scan.id)

    return json({ scan_id: scan.id, free })
  } catch (e) {
    console.error(e)
    return json({ error: 'Something went wrong' }, 500)
  }
})
