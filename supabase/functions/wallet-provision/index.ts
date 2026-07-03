import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hitchpayFetch } from "../_shared/hitchpay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateReferenceCode(userId: string): string {
  const shortId = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `PRB-${shortId.slice(0, 4)}-${shortId.slice(4, 8)}`;
}

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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? "";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure wallet exists
    await admin.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });

    // Return existing virtual account if present
    const { data: existing } = await admin
      .from("wallet_virtual_accounts")
      .select("*").eq("user_id", userId).maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ virtual_account: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to create a real virtual bank account via Hitchpay
    let bankName: string | null = null;
    let accountNumber: string | null = null;
    let accountName: string | null = null;
    let providerAccountId: string | null = null;
    let isReal = false;

    const referenceCode = generateReferenceCode(userId);

    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("user_id", userId).maybeSingle();

      const displayName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        userEmail || "Prescribly User";

      const result = await hitchpayFetch("/v1/virtual-accounts", {
        method: "POST",
        body: JSON.stringify({
          reference: referenceCode,
          customer_name: displayName,
          customer_email: userEmail,
          customer_phone: profile?.phone ?? null,
          currency: "USD",
          metadata: { user_id: userId, source: "prescribly_wallet" },
        }),
      });

      if (result.ok && result.json) {
        const va = result.json.data ?? result.json;
        accountNumber = va.account_number ?? va.number ?? null;
        bankName = va.bank_name ?? va.bank ?? null;
        accountName = va.account_name ?? displayName;
        providerAccountId = va.id ?? va.account_id ?? null;
        isReal = !!accountNumber;
      } else {
        console.warn("Hitchpay VA create failed:", result.status, result.raw);
      }
    } catch (e) {
      console.error("Hitchpay VA error:", e);
    }

    // Fallback: use Prescribly reference code as the "account number"
    if (!accountNumber) {
      accountNumber = referenceCode;
      bankName = "Prescribly Wallet Top-up Reference";
      accountName = "Add funds via 'Add money' button";
      isReal = false;
    }

    const { data: inserted, error: insErr } = await admin
      .from("wallet_virtual_accounts")
      .insert({
        user_id: userId,
        provider: "hitchpay",
        provider_account_id: providerAccountId,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        reference_code: referenceCode,
        is_real_bank_account: isReal,
      })
      .select().single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ virtual_account: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("wallet-provision error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
