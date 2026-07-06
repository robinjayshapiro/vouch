---
name: env-doctor
description: Diagnose "email/SMS/sign-in links don't work" and other env/config failures on the deployed Vouch app (Vercel + Resend/Twilio + Supabase). Use whenever prod behavior differs from local, links point to localhost, or messages aren't delivered.
---

# Env doctor — prod delivery & config triage

A full session was once spent discovering that `Resend_API_Key` ≠ `RESEND_API_KEY`
and that Vercel env vars weren't scoped to Production. This skill compresses that
session into minutes. Work the checklist in order; each step has a verdict.

## Step 0 — Read the symptom precisely

Ask Robin for (or find in Vercel logs) the exact log line. The provider wrappers are
self-diagnosing:

| Log line | Meaning |
|---|---|
| `[email:dev] would email …` | `RESEND_API_KEY`/`RESEND_FROM` not visible to the deployment → env problem, NOT a Resend problem |
| `[sms:dev] would text …` | Twilio vars not visible → same |
| Link in log/message starts `http://localhost:3000` | `APP_URL` not set in that environment |
| No log line at all for the action | The action never ran server-side — bug or wrong route, not env |
| Resend/Twilio API error (thrown, 500 in route) | Creds present but rejected → key invalid, `RESEND_FROM` domain not verified, or Twilio number/MG SID wrong |

## Step 1 — Env-var hygiene (cause of ~90% of these)

In Vercel → Project → Settings → Environment Variables, have Robin verify each var:

1. **Exact name, exact case.** `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`,
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`. Anything cased differently is a different, unread variable —
   delete and re-add; renaming in place is error-prone.
2. **Production scope checked** (vars are scoped per environment; Preview-only vars
   don't exist in prod).
3. **Redeploy after saving.** Env vars bake in at deploy time. A var added after the
   last deploy is invisible until the next one. Trigger: Deployments → ⋯ → Redeploy
   (or push any commit).
4. Expected values: `APP_URL=https://vouch.business` (no trailing slash needed —
   `appUrl()` strips it), `RESEND_FROM` like `Vouch <noreply@vouch.business>`.

## Step 2 — Confirm what the deployment actually sees

If Step 1 "looks right" but symptoms persist, don't argue with the settings screen —
measure. Add the temporary diagnostic route (this exact shape shipped before and
found the bug):

```ts
// app/api/debug/env/route.ts — TEMPORARY, booleans + non-secrets ONLY
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    hasResendFrom: Boolean(process.env.RESEND_FROM),
    resendFrom: process.env.RESEND_FROM ?? null,   // not a secret
    appUrl: process.env.APP_URL ?? null,
    hasTwilioSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
  });
}
```

Ship it, hit `https://vouch.business/api/debug/env`, read the booleans. **Never**
return key values. **Always remove this route in the same PR as the fix** — one was
left behind once and had to be cleaned up later; verify removal with
`git diff origin/master --stat`.

## Step 3 — Provider-side checks (only if env is confirmed loaded)

**Resend:** dashboard → was a send attempted? If Vouch logged delivery but Resend
shows nothing, the API call failed — check route logs for the thrown error text.
Common: domain not verified (DNS records pending), `from` address not on the verified
domain. If Resend shows "delivered", the problem is the recipient's spam folder.

**Twilio:** `TWILIO_FROM` starting with `MG` is treated as a Messaging Service SID,
anything else as a From number (`lib/sms.ts`). Trial accounts only text verified
numbers.

**Supabase:** `hasSupabaseUrl: false` → nothing works; same Step 1 hygiene. Errors
mentioning a missing column → `supabase/schema.sql` hasn't been run since the last
schema change (that's a schema problem, not env — hand off to the M3 rule).

## Step 4 — Local-vs-prod sanity matrix

| Works locally? | Works in prod? | Conclusion |
|---|---|---|
| yes (real send) | no, `[…:dev]` logs | Vercel env (Step 1) |
| yes (dev-log only) | no, `[…:dev]` logs | Creds were never set anywhere; set them in Vercel first |
| no | no | Bug or provider account issue — debug locally first, it's faster |
| yes | 500s | Read the Vercel function log for the thrown provider error (Step 3) |

## Known signatures → instant diagnoses

- Claim link opens `localhost:3000` from a real text/email → `APP_URL` missing in prod.
- Settings change appears saved, reverts on reload → prod DB missing the column
  (schema.sql not run), NOT env.
- Sign-in "sent" but nothing arrives AND Resend dashboard empty → env not loaded
  (Step 1/2), because an actual Resend failure would throw and 500.
- Everything worked yesterday, broken today after "cleaning up" env vars → a rename
  changed case or dropped Production scope.
