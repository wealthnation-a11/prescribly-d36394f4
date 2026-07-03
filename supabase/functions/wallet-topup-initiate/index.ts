import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { hitchpayFetch } from "../_shared/hitchpay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const schema = z.object({
  amount_cents: z.number().int().min(100).max(10_000_00), // $1.00 - $10,000
  redirect_url: z.string().url().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } =
      await supabaseAuth.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? "";

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { amount_cents, redirect_url } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure wallet
    await admin.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });

    const clientRef = `topup_${userId.slice(0, 8)}_${Date.now()}`;
    const amountUnits = (amount_cents / 100).toFixed(2);

    const result = await hitchpayFetch("/v1/checkouts", {
      method: "POST",
      body: JSON.stringify({
        amount: amountUnits,
        currency: "USD",
        reference: clientRef,
        email: userEmail,
        redirect_url: redirect_url ?? null,
        webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/hitchpay-webhook`,
        purpose: "Prescribly Health Wallet Top-up",
        metadata: { user_id: userId, kind: "wallet_topup", amount_cents },
      }),
    });

    if (!result.ok) {
      console.error("Hitchpay checkout failed:", result.status, result.raw);
      return new Response(JSON.stringify({
        error: "Failed to start checkout",
        provider_status: result.status,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = result.json?.data ?? result.json ?? {};
    const checkoutUrl = data.url ?? data.checkout_url ?? data.payment_url;
    const checkoutId = data.id ?? data.checkout_id ?? null;

    // Record pending topup so the webhook can idempotently confirm it
    await admin.from("wallet_transactions").insert({
      wallet_id: (await admin.from("wallets").select("id").eq("user_id", userId).maybeSingle()).data?.id,
      user_id: userId,
      type: "topup",
      direction: "credit",
      amount_cents,
      status: "pending",
      currency: "USD",
      provider: "hitchpay",
      provider_reference: clientRef,
      description: "Wallet top-up (pending)",
      metadata: { checkout_id: checkoutId },
    });

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, reference: clientRef }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("wallet-topup-initiate error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
