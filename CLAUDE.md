# CLAUDE.md — Operating manual for working in Vouch

You are working in Robin's repo. Robin is a solo, non-engineering product owner who
builds entirely through Claude Code sessions. This file is the operating manual: follow
it exactly, and when it conflicts with your instincts, the manual wins. Keep it current
when architecture or conventions change.

## What it is
Private, community-scoped vendor-recommendation app ("Angi for people you actually
know"). A community shares a short invite code; members add and vouch for local pros.
Live at https://vouch.business (Vercel, auto-deploys `master`). First real community:
Gates Ridge Civic Association (code `GATES`).

## Session startup ritual
1. Read this file, then `docs/open-tasks.md` (the persistent punch list — it is the
   source of truth for open work; the chat history is not).
2. `git status` + `git log --oneline -5` to see where the branch is.
3. If your designated branch's PR already merged, restart it from master:
   `git fetch origin master && git checkout -B <branch> origin/master`.
4. When work moves in or out of scope during the session, update `docs/open-tasks.md`
   in the same commit as the change. That file is how the next session recovers.

## Stack
- Next.js 14 (App Router) + TypeScript, React 18, Tailwind 3.4 (custom palette).
- Supabase (Postgres) via `@supabase/supabase-js` — **server-side API routes only**,
  anon key, **RLS disabled on every table**. All access control lives in route code.
  There is no DB access from the browser, ever.
- Optional providers: Resend (email) and Twilio (SMS) for magic sign-in links. Without
  creds, `lib/sms.ts`/`lib/email.ts` log the link to the server console — every auth
  flow stays testable in dev with zero config.

## Run / verify — the real gates
- `npx tsc --noEmit` and `npm run build` are the gates. Both must pass before any commit
  you intend to push. There are no tests and no CI; the build is the only machine check.
- **Never run `npm run lint`** — ESLint is not configured; it opens an interactive setup
  prompt that hangs the session.
- If `tsc` reports errors referencing `.next/types/...` for files you deleted, it's a
  stale build cache: `rm -rf .next` and re-run.
- `npm run dev` for manual verification (needs `.env.local`; see `.env.example`).

## Identity & auth model (read before touching any auth code)
- **No accounts, no passwords.** A member is a row in `vouch_members` with a private
  `token` (uuid). The browser stores `{id, token, name, communityName}` in
  localStorage under `vouch_member_{CODE}` (`lib/identity.ts`). Write APIs validate
  `{code, token}` server-side. There is no server session store.
- **Magic links:** single-use, 15-min tokens in `vouch_login_tokens` (60-min for
  approval welcomes), redeemed at `/claim/[token]`. Redemption uses an
  `.is('used_at', null)` race guard.
- **Two independent admin axes** on `vouch_communities` (set in `SettingsPanel`):
  `join_policy` (`open` | `admin_approval` | `approved_list`) and `signon_method`
  (`off` | `email` | `phone`). Contact requirements derive from both — use
  `lib/gating.ts::contactRequirements`, never re-derive inline.
- **Membership notifications** (`lib/notify.ts`): fire-and-forget — wrapped in
  try/catch, `console.error` only. A delivery failure must never block or fail the
  join/approve action that triggered it. Keep this property.

## Named mistakes — each has burned a real session. The rule that prevents each:

**M1. Trusting the optimistic UI.** The settings panel once flipped to "Email" while the
PUT silently failed (missing column in prod). *Rule: every mutation checks `res.ok`,
surfaces `data.error` via a `role="alert"` element, rolls back optimistic state, and
resyncs from the server. Pattern: `SettingsPanel.tsx::saveSettings`.*

**M2. Deleting members/communities and hitting FK 23503.** Authorship FKs do **not**
cascade: `vouch_vendors.added_by`, `vouch_vendor_edits.proposed_by/reviewed_by`,
`vouch_requests.asked_by`, `vouch_request_vendors.member_id`. *Rule: any delete of
members or a community must explicitly clear those tables first (see the preamble in
`scripts/gen-gates-sql.mjs`). Never hard-delete an approved member; `declineMember`
only deletes `pending` rows because they own nothing yet.*

**M3. Assuming the deployed DB matches `supabase/schema.sql`.** Schema changes only
exist in prod after Robin runs them in the Supabase SQL editor. *Rule: write every
schema change as `alter table … add column if not exists` (idempotent, safe to re-run),
and end any PR that touches schema with an explicit bolded instruction: "Run
`supabase/schema.sql` in Supabase before/with this deploy." A silent 500 or a
swallowed save (see M1) in prod is usually a missing column.*

**M4. Rebase resurrection.** A rebase onto master once resurrected a deleted file
(`/api/debug/env`): git dropped the "remove" commit as already-upstream but kept the
earlier "add" commit. *Rule: after any rebase onto master, run
`git diff origin/master --stat` and confirm every listed file is an intended change.
Unexpected files = resurrection; delete them again before pushing.*

**M5. Breaking the anti-enumeration property.** Auth endpoints must not reveal whether
a contact or member exists. *Rule: `/api/auth/link` always returns `{ok:true}`.
`devLink` may only be included when the provider reported not-delivered AND
`NODE_ENV !== 'production'` (`lib/signin.ts::devLinkFrom`). Never add a response field,
status code, or timing branch that differs based on member existence.*

**M6. Comparing phones/emails raw.** *Rule: phones compare on last-10-digits via
`phoneDigits()` (guard: <7 digits = no match); emails via `normalizeEmail()` (lowercase
+ trim). Matching happens in JS after fetching candidates, not in SQL. Never write a
`.eq('phone', …)` query.*

**M7. Committing real people's data.** `scripts/gates-data.json` and
`supabase/seed-gates.sql` hold real names/phones and are gitignored. *Rule: any new
file containing real contact data gets a `.gitignore` entry in the same commit that
creates the generator. Before every push: `git status` and read the file list for
anything that smells like PII.*

**M8. Forgetting the pending-member gate.** *Rule: every member write route follows the
chain: `getCommunityByCode` → 404, `getMemberByToken` → 401, `status !== 'approved'` →
403 ("Your membership is awaiting approval."), then resource `community_id` scoping →
404. Copy an existing route (`app/api/vouches/route.ts` is the cleanest template).*

**M9. Inserting duplicate vouches.** `vouch_vouches` is unique on
`(vendor_id, member_id)`. *Rule: use `upsertVouch` (upsert with `onConflict`), never a
bare insert. Same idea for request links (`request_id, vendor_id`) and allowed phones.*

**M10. Rendering before identity is known.** Reading localStorage during render or
skipping the handshake causes SSR crashes and directory flashes for pending members.
*Rule: the identity handshake is: `member` state starts null → mount effect calls
`getStoredMember(code)` → set `checkedIdentity` → render `<JoinGate>` only when
`checkedIdentity && !member`. For member-gated pages also wait for `viewerLoaded`
before showing the directory. Copy `CommunityClient.tsx`.*

**M11. Vercel env-var drift.** Env vars are case-sensitive, scoped per environment, and
only bake into deployments created after they're saved. *Rule: exact uppercase names
(`RESEND_API_KEY`, not `Resend_Api_Key`), Production scope checked, then a fresh
deploy. When email/SMS "doesn't work" in prod but works locally, this is the cause
until proven otherwise — the smoking gun in logs is `[email:dev] would email …` and
`localhost:3000` claim links.*

**M12. Making up categories or tags.** *Rule: vendor `category` must pass
`isValidCategory` (server rejects otherwise); vouch tags go through `sanitizeTags`.
UI reads the lists from `lib/categories.ts` / `lib/tags.ts` — never hardcode.*

## Conventions

### Code & API
- All Supabase queries live in `lib/db.ts`. Routes never import the Supabase client.
- Error convention in `lib/db.ts`: list/mutation functions **throw**; single-item
  getters by id/token **swallow and return undefined** (so a garbage uuid in a URL is
  a 404, not a 500). Match this split when adding functions.
- Every route: `export const dynamic = 'force-dynamic'`; body parse in try/catch →
  400 `{error:'Invalid request.'}`; errors as `{error: string}`; success either a
  payload or `{ok:true}`. Status codes: 400 validation, 401 bad token, 403 not
  approved/not admin/not owner, 404 missing/not in this community, 409 conflict,
  410 expired link, 500 caught+logged.
- Truncate inputs server-side (name 40/80, phone 30, email 120, note 280, comment
  1000). Whitelist patch fields (`sanitizeVendorChanges` pattern) — a client patch must
  never be able to touch ids or ownership columns.
- Race-guarded writes: update with `.is(…, null)` / `.eq('status','pending')` filter +
  `.select('id')`, then check a row came back. Used for token redemption, one-shot
  contact claims, edit review. Reuse it for anything claim-like.
- Invite codes: unambiguous alphabet (no 0/O/1/I/L), stored uppercase, uppercase on
  lookup.

### UI (mobile-first, warm, large-type — the app is used by all ages)
- Page shell: `<main className="mx-auto min-h-screen max-w-md px-4 pt-6 pb-12">`.
  Server `page.tsx` is a thin wrapper (force-dynamic, `getCommunityByCode`,
  `notFound()`, render the `'use client'` `*Client` component).
- Palette rules: **navy** = every standard action; **coral** = the ONE hero action per
  screen (and doubles as error text `text-coral-700`); `ink`/`soft` for text; `paper`
  background; gold = stars only. Don't introduce new colors.
- Cards `rounded-2xl bg-white p-4 shadow-card` (hero: `rounded-3xl p-6`); tappable adds
  `hover:shadow-lift`. Modals: bottom-sheet recipe — overlay `fixed inset-0 z-50 flex
  items-end justify-center bg-ink/50 p-4 sm:items-center`, panel `rounded-3xl bg-white
  p-6 shadow-lift` with `role="dialog" aria-modal="true"`.
- Inputs share the class: `mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white
  p-4 text-lg text-ink placeholder:text-soft/60 focus:border-navy-500`.
- Feedback: errors `role="alert"` coral paragraph; success inline `role="status"` navy
  banner (not toasts); busy buttons swap label to gerund + real ellipsis ("Saving…").
- Accessibility is non-negotiable: labels (or `sr-only`) on every control, `aria-hidden`
  on decorative emoji, `aria-pressed` on toggle chips, `aria-live="polite"` on lists
  that reload. Emoji lead headings/status screens by design — keep doing it.
- Copy voice: warm, plain-spoken, second person, no jargon ("You're on the list!").

### Git & shipping
- Work on the designated `claude/*` branch. Commits: imperative subject ≤72 chars, no
  period; body explains *why* and names exact files/functions. Small, cohesive commits.
- PRs are squash-merged into `master`; Vercel deploys `master` automatically.
- **Never merge a PR without Robin explicitly saying so** ("merge", "yes merge",
  "let's merge this in"). Creating the PR when work is complete is fine.
- Robin says "merge" meaning the whole ritual: verify gates → push → PR → squash-merge
  → confirm → flag any schema.sql step. Use the `/ship` skill.

### Operational scripts (`scripts/*.mjs`)
- One-off Node ESM scripts, not part of the build. Every script: header comment with
  purpose + exact `node scripts/x.mjs` run line; env via the hand-rolled `.env.local`
  parser (copy it from any existing script — no dotenv dependency); **destructive
  scripts are dry-run by default and require `--apply`**.
- Generated SQL for the Supabase editor must be a single self-contained transaction
  (`begin;`/`commit;`), idempotent (delete-then-insert with the M2 FK preamble), with
  all uuids pre-generated in JS so there are no ordering dependencies.

## Quality bar — checkable, per deliverable

**Any code change (minimum bar):**
- [ ] `npx tsc --noEmit` passes and `npm run build` passes
- [ ] `git diff origin/master --stat` lists only intended files (M4)
- [ ] No real names/phones/emails in any tracked file (M7)

**New/changed UI:**
- [ ] Renders inside `max-w-md`; nothing depends on desktop width
- [ ] Palette rules hold (one coral hero action max; navy for the rest)
- [ ] Every fetch checks `res.ok`; failure shows a `role="alert"` message; optimistic
      state rolls back (M1)
- [ ] Identity handshake pattern if the page needs a member (M10)
- [ ] Labels/aria on all new controls; decorative emoji `aria-hidden`

**New/changed API route:**
- [ ] Auth chain in order: 404 community → 401 token → 403 status/role → 404 scoping (M8)
- [ ] Inputs truncated/whitelisted; category/tags validated (M12)
- [ ] Conflict paths return 409 with a human message
- [ ] No response varies by whether a member/contact exists, on any auth-adjacent
      endpoint (M5)

**Schema change:**
- [ ] Written as idempotent `if not exists` alters appended to `supabase/schema.sql`
- [ ] New tables: `vouch_` prefix, RLS-disable line added, cascade behavior chosen
      deliberately (authorship FKs plain; containment FKs cascade)
- [ ] PR text tells Robin, in bold, to run the SQL in Supabase before/with deploy (M3)

**Operational script:**
- [ ] Header comment: what it does + run line
- [ ] Dry-run default, `--apply` to write; prints a summary of what it did/would do
- [ ] Output containing PII is gitignored in the same commit

**Docs / backlog:**
- [ ] `docs/open-tasks.md` updated when scope is added, finished, or deferred
- [ ] Shipped design docs say "as-built", not "proposed"

## When uncertain — exact escalation rules

**Proceed without asking** (reversible, on-branch): code/doc/script changes, commits,
pushes to the designated branch, opening a PR, dry-run script executions, dev-mode
manual testing.

**Ask Robin first, always:**
1. Merging any PR (even if the work was requested — merge is a separate approval).
2. Any write to live Supabase data: running SQL in the editor, any script `--apply`,
   anything touching `vouch_members`/`vouch_communities` rows in prod. Show the exact
   SQL/command and what it will change, then wait.
3. Deleting anything a user created (members, vendors, vouches, communities).
4. Changing the auth/security posture (token handling, anti-enumeration responses,
   RLS assumptions, new public endpoints exposing member data).
5. Sending real email/SMS to real people, or anything that costs money.
6. Product-direction choices where the request is ambiguous — ask with 2–3 concrete
   options and a recommendation, not an open question.

**When debugging something opaque in prod:** follow the pattern that worked before —
add a temporary read-only diagnostic route that reports booleans/non-secrets only,
confirm the hypothesis, then remove it in the same PR that ships the fix. Never leave
a diagnostic endpoint on master.

**When a request implies schema + code + data migration:** ship in that order (schema
SQL for Robin to run → code that tolerates both states → data script), and say which
step Robin owns.

## Key files
- `lib/db.ts` — all queries + normalization (`phoneDigits`, `normalizeEmail`)
- `lib/identity.ts` — localStorage identity (`vouch_member_{CODE}`)
- `lib/gating.ts` — `contactRequirements(community)`
- `lib/signin.ts` / `lib/notify.ts` — magic-link dispatch / membership notifications
- `lib/sms.ts` / `lib/email.ts` — providers + message builders + `appUrl()`
- `lib/categories.ts` / `lib/tags.ts` — fixed taxonomies + validators
- `types/index.ts` — shared types
- `components/JoinGate.tsx`, `components/LandingPage.tsx`, `components/VendorCard.tsx`
- `app/c/[code]/CommunityClient.tsx` (+ `SettingsPanel`, `ModerationPanel`,
  `AskGroupModal`) — the main surface; copy its patterns
- `app/api/…` — see M8 for the route template; `app/api/vouches/route.ts` is cleanest
- `supabase/schema.sql` — idempotent, safe to re-run
- `docs/open-tasks.md` — the living punch list; `docs/moderation-and-roles.md` — as-built
- `scripts/` — operational scripts; `gen-gates-sql.mjs` + `type-map.mjs` are the
  seeding pipeline

## Env vars
Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Optional: `APP_URL` (claim-link origin —
must be `https://vouch.business` in prod or links point at localhost), `RESEND_API_KEY`
+ `RESEND_FROM`, `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM`. Exact
uppercase names, Production scope, redeploy after changing (M11).
