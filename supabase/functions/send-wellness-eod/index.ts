// End-of-day wellness summary email.
// Gracefully no-ops if Lovable Emails isn't configured yet.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    const date = parsed.success && parsed.data.date ? parsed.data.date : new Date().toISOString().slice(0, 10);

    // Compute summary (idempotent)
    const { data: summary } = await supabase.rpc("compute_eod_summary", { _user_id: userId, _date: date });
    if (!summary) {
      return new Response(JSON.stringify({ ok: false, reason: "no_summary" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try Lovable Emails (no-op if not configured)
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("email,first_name").eq("user_id", userId).maybeSingle();
    if (!profile?.email) {
      return new Response(JSON.stringify({ ok: true, summary, email_sent: false, reason: "no_email" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let emailSent = false;
    try {
      const { error: enqErr } = await admin.rpc("enqueue_email", {
        p_queue: "transactional_emails",
        p_payload: {
          to: profile.email,
          subject: `🌙 Your wellness summary — score ${summary.total_score}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff">
            <h2>Hi ${profile.first_name || "there"}, here is your day in review</h2>
            <p style="font-size:32px;margin:8px 0"><strong>${summary.total_score}</strong> points</p>
            <p>+${summary.points_earned} earned · -${summary.points_lost} lost</p>
            <ul>
              <li>Water: ${summary.water_taken}/${summary.water_taken + summary.water_missed} glasses</li>
              <li>Medication: ${summary.meds_taken}/${summary.meds_taken + summary.meds_missed} doses</li>
              <li>Meditation: ${summary.meditation_minutes} min</li>
              <li>Steps: ${summary.steps.toLocaleString()}</li>
              <li>Sleep: ${Number(summary.sleep_hours).toFixed(1)} h</li>
            </ul>
            <p style="color:#666">Keep it up! Open Prescribly to see tomorrow's plan.</p>
          </div>`,
          purpose: "transactional",
        },
      });
      if (!enqErr) emailSent = true;
    } catch (e) {
      console.log("Email enqueue skipped:", (e as Error).message);
    }

    if (emailSent) {
      await admin.from("wellness_eod_summary").update({ email_sent: true, in_app_sent: true }).eq("user_id", userId).eq("summary_date", date);
    }

    return new Response(JSON.stringify({ ok: true, summary, email_sent: emailSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-wellness-eod error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
