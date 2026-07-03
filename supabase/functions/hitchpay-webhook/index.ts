import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyHmacSignature } from "../_shared/hitchpay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hitchpay-signature, x-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  const sigHeader =
    req.headers.get("x-hitchpay-signature") ??
    req.headers.get("x-signature") ??
    req.headers.get("hitchpay-signature");

  const webhookSecret = Deno.env.get("HITCHPAY_WEBHOOK_SECRET") ?? "";
  const verified = await verifyHmacSignature(raw, sigHeader, webhookSecret);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = null;
  try { body = JSON.parse(raw); } catch { /* ignore */ }

  const eventId = body?.event_id ?? body?.id ?? body?.data?.id ?? crypto.randomUUID();
  const eventType = body?.event_type ?? body?.event ?? body?.type ?? "unknown";

  // Log every event (idempotent on event_id)
  const { data: logged, error: logErr } = await admin
    .from("hitchpay_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload: body ?? { raw },
      signature_verified: verified,
    })
    .select().maybeSingle();

  if (logErr) {
    // Unique-violation on event_id → already processed
    if ((logErr as any).code === "23505") {
      return new Response(JSON.stringify({ status: "duplicate" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("Webhook log error:", logErr);
  }

  if (!verified) {
    console.warn("Hitchpay webhook signature invalid");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = body?.data ?? body ?? {};
    const status = (payload.status ?? "").toLowerCase();
    const isSuccess =
      ["completed", "succeeded", "paid", "success"].includes(status) ||
      ["payment.completed", "checkout.completed", "virtual_account.credited"].includes(eventType);

    if (!isSuccess) {
      await admin.from("hitchpay_events").update({ processed_at: new Date().toISOString() })
        .eq("id", logged?.id);
      return new Response(JSON.stringify({ status: "ignored", event_type: eventType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = payload.metadata ?? {};
    const reference = payload.reference ?? payload.client_reference ?? meta.reference;
    const providerRef = payload.id ?? reference;
    const amountRaw = payload.amount ?? meta.amount_cents;
    const amountCents = typeof amountRaw === "number" && amountRaw < 1000
      ? Math.round(amountRaw * 100) // decimal amount
      : Number(meta.amount_cents ?? Math.round(Number(amountRaw) * 100));

    // Resolve user_id
    let userId: string | null = meta.user_id ?? null;
    if (!userId && reference) {
      const { data: pending } = await admin
        .from("wallet_transactions")
        .select("user_id, id, status")
        .eq("provider", "hitchpay")
        .eq("provider_reference", reference)
        .maybeSingle();
      userId = pending?.user_id ?? null;
    }

    // Virtual account credit event → look up by provider_account_id or account_number
    if (!userId) {
      const providerAccountId = payload.virtual_account_id ?? payload.account_id;
      const accountNumber = payload.account_number;
      if (providerAccountId || accountNumber) {
        const q = admin.from("wallet_virtual_accounts").select("user_id");
        const { data: va } = providerAccountId
          ? await q.eq("provider_account_id", providerAccountId).maybeSingle()
          : await q.eq("account_number", accountNumber).maybeSingle();
        userId = va?.user_id ?? null;
      }
    }

    if (!userId || !amountCents || amountCents <= 0) {
      throw new Error(`Cannot resolve user_id or amount (user_id=${userId}, amount=${amountCents})`);
    }

    // Mark any pending topup row as failed-out-of-band by updating to succeeded, otherwise credit
    if (reference) {
      const { data: pending } = await admin
        .from("wallet_transactions").select("id, status")
        .eq("provider", "hitchpay").eq("provider_reference", reference).maybeSingle();
      if (pending && pending.status === "succeeded") {
        await admin.from("hitchpay_events").update({ processed_at: new Date().toISOString() }).eq("id", logged?.id);
        return new Response(JSON.stringify({ status: "already_credited" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (pending) {
        await admin.from("wallet_transactions").delete().eq("id", pending.id);
      }
    }

    const { error: creditErr } = await admin.rpc("credit_wallet", {
      _user_id: userId,
      _amount_cents: amountCents,
      _type: "topup",
      _provider: "hitchpay",
      _provider_reference: providerRef,
      _related_id: null,
      _description: "Wallet top-up",
      _metadata: { event_id: eventId, event_type: eventType },
    });
    if (creditErr) throw creditErr;

    await admin.from("hitchpay_events").update({ processed_at: new Date().toISOString() }).eq("id", logged?.id);

    return new Response(JSON.stringify({ status: "credited", user_id: userId, amount_cents: amountCents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("hitchpay-webhook processing error:", err);
    await admin.from("hitchpay_events").update({ error: err.message ?? String(err) }).eq("id", logged?.id);
    return new Response(JSON.stringify({ error: err.message ?? "processing error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
