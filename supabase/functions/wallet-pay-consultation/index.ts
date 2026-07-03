import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const schema = z.object({
  appointment_id: z.string().uuid(),
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

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { appointment_id } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load appointment & verify ownership
    const { data: appt, error: apptErr } = await admin
      .from("appointments")
      .select("id, patient_id, doctor_id, status")
      .eq("id", appointment_id).maybeSingle();
    if (apptErr) throw apptErr;
    if (!appt) return new Response(JSON.stringify({ error: "Appointment not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    if (appt.patient_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already paid?
    const { data: existingPay } = await admin
      .from("consultation_payments")
      .select("id, status").eq("appointment_id", appointment_id).eq("patient_id", userId)
      .eq("status", "completed").maybeSingle();
    if (existingPay) {
      return new Response(JSON.stringify({ status: "already_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side price: prefer the doctor's consultation_fee, fall back to $10
    const { data: doctor } = await admin
      .from("doctors").select("consultation_fee")
      .eq("user_id", appt.doctor_id).maybeSingle();
    const feeUsd = Number(doctor?.consultation_fee ?? 10);
    const amountCents = Math.max(1, Math.round(feeUsd * 100));

    // Debit wallet
    const { data: txn, error: debitErr } = await admin.rpc("debit_wallet", {
      _user_id: userId,
      _amount_cents: amountCents,
      _type: "consultation_charge",
      _related_id: appointment_id,
      _description: `Consultation payment`,
      _metadata: { appointment_id, doctor_id: appt.doctor_id },
    });
    if (debitErr) {
      const msg = String(debitErr.message || debitErr);
      if (msg.includes("insufficient")) {
        return new Response(JSON.stringify({ error: "insufficient_funds" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw debitErr;
    }

    // Record consultation payment
    await admin.from("consultation_payments").insert({
      appointment_id,
      patient_id: userId,
      doctor_id: appt.doctor_id,
      amount: feeUsd,
      currency: "USD",
      status: "completed",
      payment_method: "prescribly_wallet",
      transaction_reference: `wallet_${(txn as any)?.id ?? Date.now()}`,
    });

    return new Response(JSON.stringify({ status: "paid", amount_cents: amountCents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("wallet-pay-consultation error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
