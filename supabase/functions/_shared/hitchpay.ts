// Shared Hitchpay API client. If the actual Hitchpay base URL differs,
// override with the HITCHPAY_API_BASE env var — no code changes needed.

export const HITCHPAY_BASE =
  Deno.env.get("HITCHPAY_API_BASE") ?? "https://api.hitchpay.com";

const CLIENT_ID = Deno.env.get("HITCHPAY_CLIENT_ID") ?? "";
const SECRET_KEY = Deno.env.get("HITCHPAY_SECRET_KEY") ?? "";

function authHeaders(): HeadersInit {
  return {
    "Authorization": `Bearer ${SECRET_KEY}`,
    "X-Client-Id": CLIENT_ID,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

export async function hitchpayFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${HITCHPAY_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  return { ok: res.ok, status: res.status, json, raw: text };
}

// HMAC-SHA256 hex signature (typical webhook scheme)
export async function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  // Accept either raw hex or "sha256=hex"
  const clean = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();
  return clean === hex;
}
