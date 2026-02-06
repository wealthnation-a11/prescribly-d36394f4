

# Remaining Security and Hardening Tasks

## Overview

After reviewing all scan results, linter warnings, and the codebase, here is everything that still needs to be addressed, organized by priority.

---

## 1. Database RLS Fix: security_audit INSERT Policy (High Priority)

**Problem**: The `security_audit` table allows ANY authenticated user to insert records (`WITH CHECK (auth.uid() IS NOT NULL)`). Attackers could flood audit logs or plant false evidence.

**Fix**: Restrict INSERT to `service_role` only by dropping the current policy and creating one with `WITH CHECK (false)` for authenticated users (service_role bypasses RLS automatically).

---

## 2. Edge Functions Missing Zod Validation (High Priority)

**Problem**: 28 out of 48 edge functions lack Zod input validation, making them vulnerable to injection, type confusion, and DoS attacks.

**Functions needing Zod schemas added**:
- admin-analytics
- admin-financial
- charge-recurring
- create-audit-log
- create-notification
- daily-health-tip
- daily-step-reset
- diagnose-symptoms-secure
- diagnose-symptoms
- diagnose-with-bayesian
- doctor-actions
- generate-prescription-pdf
- log-history
- log-monitoring-event
- log-wellness-history
- parse-symptoms
- paystack-verify
- paystack-webhook
- publish-herbal-article
- qa-testing-runner
- resume-session
- save-session
- schedule-appointment-reminders
- secure-doctor-actions
- send-appointment-email
- send-email-notification
- send-push-notification
- subscription-reminders
- update-exchange-rates

**Approach**: Add `z.object()` schemas to validate all request body fields (UUIDs, enums, string lengths, array limits) at the top of each function handler, returning 400 on validation failure.

---

## 3. Supabase Dashboard Manual Actions (Medium Priority)

These cannot be fixed via code -- they require manual action in the Supabase Dashboard:

| Action | Where |
|--------|-------|
| Enable Leaked Password Protection | Auth > Settings > Security |
| Move `pg_trgm` extension out of public schema | Database > Extensions |
| Apply Postgres security patches | Project Settings > Infrastructure |

---

## 4. Profiles RLS Policy Clarification (Low Priority -- Already Fixed)

The scan flags overlapping policies on the `profiles` table. The current setup has:
- `Deny anonymous access to profiles` with `USING (false)` for `anon` -- this is correct and blocks anonymous reads.
- Authenticated policy restricts to own profile or admin.

This is actually properly configured. The scanner is confused by the `false` condition, but that is the intended deny-all for anonymous users. No code change needed -- I will mark this finding as resolved.

---

## Technical Details

### security_audit Policy Fix (SQL Migration)

```sql
DROP POLICY IF EXISTS "Authenticated users can create security audit logs" ON security_audit;
DROP POLICY IF EXISTS "System can create security audit logs" ON security_audit;

-- Only service_role can insert (RLS is bypassed by service_role automatically)
-- No INSERT policy needed for authenticated users
CREATE POLICY "Deny authenticated insert to security_audit"
ON security_audit FOR INSERT
TO authenticated
WITH CHECK (false);
```

### Edge Function Validation Pattern

Each function will get a Zod schema like:

```typescript
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const requestSchema = z.object({
  // fields specific to each function
});

// Inside handler:
const body = await req.json();
const validation = requestSchema.safeParse(body);
if (!validation.success) {
  return new Response(JSON.stringify({
    error: 'Invalid input',
    details: validation.error.errors
  }), { status: 400, headers: corsHeaders });
}
const data = validation.data;
```

### Estimated Scope

- 1 database migration (security_audit policy)
- 28 edge function files to update with Zod validation
- Security scan findings to mark as resolved
- No frontend changes required

