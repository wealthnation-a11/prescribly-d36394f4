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

// Question bank used for adaptive questioning
const QUESTION_BANK: Array<{ id: string; text: string; options: string[] }> = [
  { id: "fever", text: "Do you have fever or chills?", options: ["yes", "no"] },
  { id: "cough", text: "Are you coughing?", options: ["yes", "no"] },
  { id: "sore_throat", text: "Do you have a sore throat?", options: ["yes", "no"] },
  { id: "breath", text: "Any shortness of breath?", options: ["yes", "no"] },
  { id: "pain", text: "Is your pain mild or severe?", options: ["mild", "severe"] },
  { id: "nausea", text: "Are you experiencing nausea?", options: ["yes", "no"] },
  { id: "pregnant", text: "Are you currently pregnant?", options: ["yes", "no"] },
];

// Helpers: RxNorm
async function getRxCuiByName(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    return data?.idGroup?.rxnormId?.[0] ?? null;
  } catch {
    return null;
  }
}

async function checkInteractions(rxcuis: string[]): Promise<{ risky: boolean; details: string[] }>{
  try {
    if (!rxcuis.length) return { risky: false, details: [] };
    const res = await fetch(
      `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(rxcuis.join("+"))}`
    );
    if (!res.ok) return { risky: false, details: [] };
    const data = await res.json();
    const groups = data?.fullInteractionTypeGroup ?? [];
    let risky = false;
    const findings: string[] = [];
    for (const g of groups) {
      for (const t of g.fullInteractionType ?? []) {
        for (const p of t.interactionPair ?? []) {
          const sev = (p.severity || '').toLowerCase();
          const desc = p.description || '';
          if (sev === 'high' || desc.toLowerCase().includes('contraindicated')) risky = true;
          findings.push(`${sev || 'unknown'}: ${desc}`);
        }
      }
    }
    return { risky, details: findings };
  } catch {
    return { risky: false, details: [] };
  }
}

// Math utils
function entropy(dist: Record<string, number>): number {
  let h = 0;
  for (const k in dist) {
    const p = dist[k];
    if (p > 0) h += -p * Math.log2(p);
  }
  return h;
}

function normalize(scores: Record<string, number>): Record<string, number> {
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  for (const k in scores) out[k] = scores[k] / total;
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ 
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase configuration' })
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ 
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API service unavailable' })
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const {
      symptomText = '',
      selectedSymptoms = [],
      answers = [], // [{ id: string, value: 'yes'|'no'|'mild'|'severe' }]
      options = { threshold: 0.75, max_questions: 6 },
      visitId = null,
      pregnancy_status = null as null | boolean,
    } = body || {};

    const threshold = typeof options?.threshold === 'number' ? options.threshold : 0.75;
    const maxQuestions = typeof options?.max_questions === 'number' ? options.max_questions : 6;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - Please log in' })
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    const userId = userData.user.id;

    // Persist pregnancy status if provided explicitly
    if (typeof pregnancy_status === 'boolean') {
      await supabase.from('patients').update({ pregnancy_status }).eq('user_id', userId);
    }

    // Load all active protocols (scope diagnoses to those with approved medications)
    const { data: protocols } = await supabase
      .from('approved_medications')
      .select('id, diagnosis_name, icd10_code, protocol, active')
      .eq('active', true);

    const DISEASES: Array<{ name: string; icd10: string }> = (protocols || [])
      .map((p: any) => ({ name: p.diagnosis_name, icd10: p.icd10_code }))
      .filter((d) => d.name && d.icd10);

    // Build messages for GPT to extract conditional probabilities and ICD mapping
    const evidence = {
      symptomText,
      selectedSymptoms,
      answers,
      questionBank: QUESTION_BANK,
      diseases: DISEASES.slice(0, 12), // cap for token safety
    };

    const gptReq = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a medical Bayesian assistant. Return strictly valid JSON with priors and P(answer|disease) for the question bank. Keep probabilities between 0.01 and 0.99.' },
          { role: 'user', content: `Evidence: ${JSON.stringify(evidence)}\nReturn JSON with keys: priors (Record<disease, number>), cond_probs (Record<questionId, Record<disease, Record<answer,string>>>>), icd10_map (Record<disease, string>), differential (Array<{name, confidence}>)` }
        ]
      })
    });

    if (!gptReq.ok) {
      const errorText = await gptReq.text();
      console.error('OpenAI API error:', errorText);
      
      // Parse error details for better handling
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 'insufficient_quota') {
          throw new Error('insufficient_quota: OpenAI API quota exceeded. Please try again later.');
        }
      } catch (parseError) {
        // If parsing fails, use the original error
      }
      
      throw new Error(`OpenAI error: ${errorText}`);
    }
    const gptJson = await gptReq.json();
    let gpt;
    try { gpt = JSON.parse(gptJson.choices[0].message.content); } catch { gpt = {}; }
    const priors: Record<string, number> = gpt.priors || Object.fromEntries(DISEASES.map((d) => [d.name, 1 / Math.max(1, DISEASES.length)]));
    const cond_probs: Record<string, Record<string, Record<string, number>>> = gpt.cond_probs || {};
    const icd10_map: Record<string, string> = gpt.icd10_map || Object.fromEntries(DISEASES.map((d) => [d.name, d.icd10]));

    // Compute posteriors via naive Bayes
    let posterior: Record<string, number> = { ...priors };
    for (const disease of Object.keys(posterior)) {
      let score = posterior[disease] || (1 / Math.max(1, DISEASES.length));
      for (const a of answers) {
        const q = a.id;
        const v = (a.value || '').toLowerCase();
        const cp = cond_probs?.[q]?.[disease]?.[v];
        const p = typeof cp === 'number' ? cp : 0.5;
        score *= Math.max(0.01, Math.min(0.99, p));
      }
      posterior[disease] = score;
    }
    posterior = normalize(posterior);

    const ranked = Object.entries(posterior)
      .sort((a, b) => b[1] - a[1])
      .map(([name, confidence]) => ({ name, confidence, icd10: icd10_map[name] }))
      .slice(0, 5);

    // Decide if finished or select next best question via info gain
    const askedIds = new Set<string>(answers.map((a: any) => a.id));
    const remaining = QUESTION_BANK.filter((q) => !askedIds.has(q.id));
    const maxPosterior = ranked[0]?.confidence || 0;

    let finished = false;
    let next_question: { id: string; text: string; options: string[] } | null = null;

    if (maxPosterior >= threshold || answers.length >= maxQuestions || remaining.length === 0) {
      finished = true;
    } else {
      // Expected entropy for each remaining question
      const baseH = entropy(Object.fromEntries(Object.entries(posterior)));
      let bestGain = -Infinity;
      for (const q of remaining) {
        let expectedH = 0;
        for (const ans of q.options) {
          // P(ans) = sum_d P(d) * P(ans|d)
          let pAns = 0;
          const posteriorGivenAns: Record<string, number> = {};
          for (const d of Object.keys(posterior)) {
            const pda = (cond_probs?.[q.id]?.[d]?.[ans] ?? 0.5);
            pAns += posterior[d] * pda;
          }
          if (pAns <= 0) continue;
          // P(d|ans) ∝ P(d) * P(ans|d)
          for (const d of Object.keys(posterior)) {
            const pda = (cond_probs?.[q.id]?.[d]?.[ans] ?? 0.5);
            posteriorGivenAns[d] = posterior[d] * pda;
          }
          const normPost = normalize(posteriorGivenAns);
          expectedH += pAns * entropy(normPost);
        }
        const gain = baseH - expectedH;
        if (gain > bestGain) {
          bestGain = gain;
          next_question = q;
        }
      }
    }

    // Get or create visit
    let visitRow: any = null;
    if (visitId) {
      const { data: v } = await supabase.from('patient_visits').select('*').eq('id', visitId).maybeSingle();
      visitRow = v;
    }
    if (!visitRow) {
      const { data: v } = await supabase
        .from('patient_visits')
        .insert({
          patient_id: userId,
          symptom_text: symptomText,
          selected_symptoms: selectedSymptoms,
          clarifying_qna: answers,
          status: finished ? 'completed' : 'in_progress',
        })
        .select()
        .maybeSingle();
      visitRow = v;
    } else {
      await supabase
        .from('patient_visits')
        .update({ clarifying_qna: answers, status: finished ? 'completed' : 'in_progress' })
        .eq('id', visitRow.id);
    }

    // If not finished, return next question
    if (!finished && next_question) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          body: JSON.stringify({
            message: "Next question ready",
            data: {
              visitId: visitRow?.id,
              finished: false,
              nextQuestion: { id: next_question.id, text: next_question.text, options: next_question.options },
              differential: ranked,
            }
          })
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Finished: perform safety checks and generate prescription if possible
    const { data: patient } = await supabase
      .from('patients')
      .select('date_of_birth, allergies, current_medications, gender, pregnancy_status')
      .eq('user_id', userId)
      .maybeSingle();

    const safetyFlags: string[] = [];
    let prescriptionRecord: any = null;

    for (const ddx of ranked) {
      const proto = (protocols || []).find((p: any) => p.icd10_code === ddx.icd10 || (p.diagnosis_name || '').toLowerCase() === ddx.name.toLowerCase());
      if (!proto) continue;
      const meds = Array.isArray(proto.protocol?.medications) ? proto.protocol.medications : [];

      // Allergy check
      const allergies = (patient?.allergies || '').toLowerCase();
      const allergyHit = meds.some((m: any) => allergies && allergies.includes((m.name || '').toLowerCase()));
      if (allergyHit) { safetyFlags.push(`Allergy conflict for ${ddx.name}`); continue; }

      // Pregnancy simple check if any med carries pregnancy contraindication field
      const isPregnant = !!patient?.pregnancy_status;
      const pregContra = meds.some((m: any) => {
        const contras = (m.contraindications || []) as string[];
        return isPregnant && contras.map((s) => (s || '').toLowerCase()).some((s) => s.includes('pregnan'));
      });
      if (pregContra) { safetyFlags.push(`Medication contraindicated in pregnancy for ${ddx.name}`); continue; }

      // RxNorm interactions with current meds
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
      if (protocolCUIs.length && patientCUIs.length) {
        const { risky, details } = await checkInteractions([...protocolCUIs, ...patientCUIs]);
        if (risky) { safetyFlags.push(`Potential drug interaction: ${details.slice(0,3).join('; ')}`); continue; }
      }

      // Passed safety checks: create prescription
      const { data: rx, error: rxErr } = await supabase
        .from('patient_prescriptions')
        .insert({
          visit_id: visitRow?.id,
          patient_id: userId,
          medications: meds,
          diagnosis: { name: ddx.name, icd10: ddx.icd10, confidence: ddx.confidence },
          safety_flags: safetyFlags.length ? safetyFlags : null,
          status: 'generated',
        })
        .select()
        .maybeSingle();
      if (rxErr) throw rxErr;
      prescriptionRecord = rx;
      break;
    }

    await supabase
      .from('patient_visits')
      .update({
        ai_differential: ranked,
        safety_flags: safetyFlags.length ? safetyFlags : null,
        status: 'completed',
        prescription_id: prescriptionRecord?.id || null,
      })
      .eq('id', visitRow?.id || '');

    return new Response(
      JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
          message: "Assessment completed successfully",
          data: {
            visitId: visitRow?.id,
            finished: true,
            diagnoses: ranked,
            safetyFlags,
            prescription: prescriptionRecord,
            status: prescriptionRecord ? 'prescription_generated' : 'no_safe_medication',
          }
        })
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('ai-diagnosis error', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Unknown error';
    
    // Determine appropriate status code based on error type
    if (errorMessage.includes('insufficient_quota')) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'AI service temporarily unavailable due to quota limits. Please try again later.';
    } else if (errorMessage.includes('Unauthorized')) {
      statusCode = 401;
    } else if (errorMessage.includes('Invalid') || errorMessage.includes('required')) {
      statusCode = 400;
    }
    
    return new Response(JSON.stringify({
      statusCode: statusCode,
      body: JSON.stringify({ error: errorMessage })
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
