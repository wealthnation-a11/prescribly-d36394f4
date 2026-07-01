// Gift — women's health AI assistant (chat + mood reasoner)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  mode: z.enum(["chat", "mood-reason", "delay", "insight"]).default("chat"),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(4000),
  })).optional(),
  // for one-shot helpers
  mood: z.string().optional(),
  context: z.string().max(2000).optional(),
});

const persona = `You are Gift, a warm, caring women's health assistant on the Prescribly app.
You help with cycle, fertility, symptoms and mood. Be short, kind and specific.
Always end health information with: "This is general information, not medical advice — please see a doctor for diagnosis or treatment."`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid input" }, 400);
    const { mode, messages, mood, context } = parsed.data;

    // Pull cycle context
    const [{ data: profile }, { data: cycles }] = await Promise.all([
      supabase.from("women_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("cycle_records").select("cycle_start_date,period_length").eq("user_id", user.id).order("cycle_start_date", { ascending: false }).limit(6),
    ]);
    const ctx = `Cycle context: profile=${JSON.stringify(profile ?? {})} recent_cycles=${JSON.stringify(cycles ?? [])}. ${context ?? ""}`;

    let userMessages: Array<{ role: string; content: string }> = [];
    if (mode === "mood-reason") {
      userMessages = [{ role: "user", content: `The user says her mood today is "${mood}". In 2-3 short sentences, gently explain likely reasons connected to her cycle phase (based on the context) and suggest one small, kind action she can take. Do not diagnose.` }];
    } else if (mode === "delay") {
      userMessages = [{ role: "user", content: "My period is late. Explain likely reasons (stress, travel, sleep, weight, hormones, PCOS, pregnancy, etc.) in a warm, non-alarming way, and list 4 checks I can do at home. End with when to see a doctor." }];
    } else if (mode === "insight") {
      userMessages = [{ role: "user", content: "Give me ONE short daily insight about my current cycle phase (2 sentences)." }];
    } else {
      userMessages = messages ?? [];
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const stream = mode === "chat";
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: persona + "\n" + ctx },
          ...userMessages,
        ],
        stream,
      }),
    });

    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit, try again shortly." }, 429);
      if (r.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await r.text();
      console.error("gift gateway error", r.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    if (stream) {
      return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return json({ text });
  } catch (e) {
    console.error("gift-assistant error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
