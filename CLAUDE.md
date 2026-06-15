# CLAUDE.md

Project context for Vouch. Keep this current when architecture or conventions change.

## What it is
Private, community-scoped vendor-recommendation app ("Angi for people you actually
know"). A community shares a 6-char invite code; members add and vouch for local pros.

## Stack
- Next.js 14 (App Router) + TypeScript, React 18
- Tailwind CSS 3.4
- Supabase (Postgres) via `@supabase/supabase-js`, accessed **only** from server-side
  API routes (anon key, RLS disabled — see `supabase/schema.sql`). No DB access from the
  browser.
- Optional providers: Twilio (SMS) and Resend (email) for magic sign-in links.

## Run / verify
- `npm run dev` — local dev (needs `.env.local`; see `.env.example`).
- `npx tsc --noEmit` and `npm run build` — the real gates. (`npm run lint` is not
  configured — it triggers an interactive setup prompt; skip it.)
- DB schema lives in `supabase/schema.sql`; run it in the Supabase SQL editor. All
  `alter table … add column if not exists` so it's safe to re-run.
- Without provider creds, `lib/sms.ts` and `lib/email.ts` **log the magic link to the
  server console** instead of sending — the whole flow stays testable in dev.

## Identity & auth model
- **No passwords.** A member is a row in `vouch_members` with a private `token`, stored
  client-side in `localStorage` per community (`vouch_member_{CODE}`, see `lib/identity.ts`).
  Write APIs validate `{code, token}` server-side; there is no server session store.
- **Magic links:** single-use, 15-min tokens in `vouch_login_tokens` (channel-agnostic).
  Redeemed at `/claim/[token]` → stores the member in localStorage → signed in. Opening a
  link in the **same browser** persists the session (no re-auth); a different device needs
  a fresh link.

### Two independent admin axes (set in `SettingsPanel`)
1. **Approval policy** — `vouch_communities.join_policy`: `open` | `admin_approval` |
   `approved_list`. `approved_list` matches the joiner's **phone** against
   `vouch_allowed_phones` (allowlist is phone-only).
2. **Sign-on mechanism** — `vouch_communities.signon_method`: `off` | `email` | `phone`.
   How returning members sign in (and what contact is collected): `phone` → SMS (Twilio),
   `email` → email (Resend), `off` → name only, no magic link.

**Contact requirement (derived, see `lib/gating.ts::contactRequirements`):**
- email required ⇔ `signon_method === 'email'`
- phone required ⇔ `signon_method === 'phone'` OR `join_policy === 'approved_list'`
- Both can apply at once (e.g. approved_list + email sign-on → phone for the gate, email
  for the login link). A selected sign-on method is **always required** (use `off` for
  name-only). Default `signon_method` is `'phone'`.

## Key files
- `lib/db.ts` — all Supabase queries. Phone helpers have email parallels
  (`findMemberByEmail`, `setMemberEmail`, `phoneDigits`/`normalizeEmail`).
- `lib/signin.ts` — `sendSignInLink(member, community)` picks SMS vs email by
  `signon_method`. Reuse this anywhere a sign-in link is sent.
- `lib/gating.ts` — `contactRequirements(community)`.
- `lib/sms.ts` / `lib/email.ts` — provider send + message/subject builders + `appUrl()`.
- `components/JoinGate.tsx` — onboarding modal; fetches `GET /api/communities/[code]/public`
  for `{signonMethod, requirePhone, requireEmail}` to render the right field(s).
- `components/LandingPage.tsx` — home + join-by-code (also uses `/public`).
- `app/c/[code]/SettingsPanel.tsx` — admin UI for both axes + phone allowlist.
- API: `app/api/communities/[code]/{join,settings,public,allowed-phones}/`,
  `app/api/auth/{link,claim,claim-by-name,phone}/`. `/api/auth/link` is the unified
  magic-link request route (replaced the old `/api/auth/sms`).
- `types/index.ts` — shared types (`JoinPolicy`, `SignonMethod`, `Member`, etc.).

## Conventions
- Phones compared on last-10-digits (`phoneDigits`); emails normalized lowercase/trimmed
  (`normalizeEmail`).
- Invite codes: unambiguous alphabet (no 0/O, 1/I/L), stored uppercase.
- Auth endpoints that look up members answer uniformly (e.g. always `{ok:true}`) so they
  can't be used to probe which contacts exist.
- Mobile-first, large text, accessible copy; match the surrounding component style.

## Env vars
Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Optional: `APP_URL` (claim-link origin),
`RESEND_API_KEY` + `RESEND_FROM` (email sign-on), `TWILIO_ACCOUNT_SID` +
`TWILIO_AUTH_TOKEN` + `TWILIO_FROM` (phone sign-on). See `.env.example`.

## Deploy
Vercel auto-redeploys on push to `master`. Apply any `schema.sql` changes in Supabase
before/with the deploy since routes read the new columns at runtime.
