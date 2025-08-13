import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Helpers
async function getRxCuiByName(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`
    );
    const data = await res.json();
    return data?.idGroup?.rxnormId?.[0] ?? null;
  } catch {
    return null;
  }
}

async function checkInteractions(rxcuis: string[]): Promise<{ risky: boolean; details: any }>{
  try {
    if (!rxcuis.length) return { risky: false, details: null };
    const res = await fetch(
      `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(rxcuis.join("+"))}`
    );
    if (!res.ok) return { risky: false, details: null };
    const data = await res.json();
    const groups = data?.fullInteractionTypeGroup ?? [];
    let risky = false;
    const findings: string[] = [];
    for (const g of groups) {
      for (const t of g.fullInteractionType ?? []) {
        for (const p of t.interactionPair ?? []) {
          const sev = (p.severity || '').toLowerCase();
          const desc = p.description || '';
          if (sev === 'high' || desc.toLowerCase().includes('contraindicated')) {
            risky = true;
          }
          findings.push(`${sev || 'unknown'}: ${desc}`);
        }
      }
    }
    return { risky, details: findings };
  } catch (e) {
    return { risky: false, details: null };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { symptomText, selectedSymptoms = [], clarifyingAnswers = null } = await req.json();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create visit row (in_progress)
    const { data: visit, error: visitErr } = await supabase
      .from('patient_visits')
      .insert({
        patient_id: userId,
        symptom_text: symptomText,
        selected_symptoms: selectedSymptoms,
        clarifying_qna: clarifyingAnswers ? [{ q: 'user_response', a: clarifyingAnswers }] : null,
        status: 'in_progress',
      })
      .select()
      .maybeSingle();

    if (visitErr || !visit) throw visitErr || new Error('Failed to create visit');

    // Fetch patient context for safety checks
    const { data: patient } = await supabase
      .from('patients')
      .select('date_of_birth, allergies, current_medications, gender')
      .eq('user_id', userId)
      .maybeSingle();

    // 1) Generate differential diagnoses with ICD-10 via OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a medical assistant. Return strictly valid JSON.' },
          { role: 'user', content: `Given the symptoms: ${symptomText}. Selected symptoms: ${JSON.stringify(selectedSymptoms)}. Provide up to 3 differential diagnoses with fields: name, icd10, confidence (0-1), rationale, red_flags (array).` }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiRes.ok) {
      throw new Error(`OpenAI error: ${await openaiRes.text()}`);
    }
    const openaiJson = await openaiRes.json();
    let ai;
    try {
      ai = JSON.parse(openaiJson.choices[0].message.content);
    } catch {
      ai = { diagnoses: [] };
    }
    const diagnoses = ai.diagnoses || [];
    const icdCodes = diagnoses.map((d: any) => d.icd10).filter(Boolean);

    // 2) Load standing order protocols
    const { data: protocolsByCode } = await supabase
      .from('approved_medications')
      .select('id, diagnosis_name, icd10_code, protocol, active')
      .eq('active', true)
      .in('icd10_code', icdCodes.length ? icdCodes : ['__none__']);

    let protocols = protocolsByCode || [];

    if ((!protocols || protocols.length === 0) && diagnoses.length) {
      const names = diagnoses.map((d: any) => d.name);
      const { data: byName } = await supabase
        .from('approved_medications')
        .select('id, diagnosis_name, icd10_code, protocol, active')
        .eq('active', true)
        .in('diagnosis_name', names);
      protocols = byName || [];
    }

    // 3) Safety checks (allergies, interactions)
    const safetyFlags: string[] = [];
    let chosenDiagnosis: any = null;
    let chosenProtocol: any = null;

    for (const d of diagnoses) {
      const match = protocols.find((p: any) => p.icd10_code === d.icd10 || (p.diagnosis_name || '').toLowerCase() === (d.name || '').toLowerCase());
      if (!match) continue;

      const meds = Array.isArray(match.protocol?.medications) ? match.protocol.medications : [];

      // Allergy check (basic string match)
      const allergies = (patient?.allergies || '').toLowerCase();
      const allergyHit = meds.some((m: any) => allergies && allergies.includes((m.name || '').toLowerCase()));
      if (allergyHit) {
        safetyFlags.push(`Allergy conflict with protocol for ${d.name}.`);
        continue;
      }

      // RxNorm interactions between protocol meds and patient's current meds
      const currentMeds: string[] = (patient?.current_medications || '').split(',').map((s) => s.trim()).filter(Boolean);
      const protocolCUIs: string[] = [];
      for (const med of meds) {
        const cui = await getRxCuiByName(med.name || '');
        if (cui) protocolCUIs.push(cui);
      }

      const patientCUIs: string[] = [];
      for (const cm of currentMeds) {
        const cui = await getRxCuiByName(cm);
        if (cui) patientCUIs.push(cui);
      }

      let risky = false;
      if (protocolCUIs.length && patientCUIs.length) {
        const { risky: r, details } = await checkInteractions([...protocolCUIs, ...patientCUIs]);
        risky = r;
        if (risky) safetyFlags.push(`Potential drug interaction detected: ${JSON.stringify(details).slice(0, 300)}...`);
      }

      if (!risky) {
        chosenDiagnosis = d;
        chosenProtocol = match;
        break;
      }
    }

    // 4) Persist results
    let finalStatus = 'diagnosis_complete';
    let prescriptionRecord: any = null;

    if (chosenDiagnosis && chosenProtocol) {
      // Create patient_prescriptions
      const medications = chosenProtocol.protocol?.medications || [];
      const { data: rx, error: rxErr } = await supabase
        .from('patient_prescriptions')
        .insert({
          visit_id: visit.id,
          patient_id: userId,
          medications,
          diagnosis: chosenDiagnosis,
          status: safetyFlags.length ? 'needs_review' : 'generated',
          safety_flags: safetyFlags.length ? safetyFlags : null,
        })
        .select()
        .maybeSingle();

      if (rxErr) throw rxErr;
      prescriptionRecord = rx;
      finalStatus = (rx?.status === 'generated') ? 'prescription_generated' : 'review_required';
    } else {
      finalStatus = 'review_required';
      if (!protocols?.length) safetyFlags.push('No standing order protocol found for the top diagnoses.');
    }

    const { data: updatedVisit } = await supabase
      .from('patient_visits')
      .update({
        ai_differential: diagnoses,
        safety_flags: safetyFlags.length ? safetyFlags : null,
        status: finalStatus === 'review_required' ? 'review_required' : 'completed',
        prescription_id: prescriptionRecord?.id || null,
      })
      .eq('id', visit.id)
      .select()
      .maybeSingle();

    return new Response(
      JSON.stringify({
        visitId: visit.id,
        status: finalStatus,
        diagnoses,
        safetyFlags,
        prescription: prescriptionRecord,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('ai-diagnosis error', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
