# Vouch 🤝

**Pros your neighbors trust.** Vouch is a private, community-based vendor
recommendation app — like Angi, but scoped to people you actually know. A
neighborhood, a family, a church group, or a circle of friends starts a
community, shares a 6-character invite code, and everyone adds the plumbers,
babysitters, handymen, and mechanics they would happily hire again.

## Design principles

- **Mobile-first.** Single-column layout, 44px+ touch targets, fixed
  bottom call-to-action, `tel:` links so a recommendation is one tap from a
  phone call.
- **Accessible to all ages and skill levels.** No passwords and no email
  signup — joining is "type your name." Large default text (17px base),
  emoji-anchored categories, plain-language copy and error messages, semantic
  HTML with labels, `aria-live` regions, and visible focus outlines. Pinch
  zoom is never disabled.
- **Trust over scale.** Every vouch is attached to a real name from your
  community. One vouch per person per vendor (vouching again updates yours).
  Invite codes use an unambiguous alphabet (no 0/O or 1/I/L) so they're easy
  to read over the phone.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS 3.4](https://tailwindcss.com/) for styling
- [Supabase](https://supabase.com/) (Postgres) — all access goes through
  server-side API routes; no keys are exposed to the browser
- Optional [Twilio](https://www.twilio.com/) for SMS magic-link sign-in
  (falls back to logging the link to the server console in dev)

## Getting started

1. Create a `.env.local` with your Supabase project credentials:

   ```
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>

   # Optional — enables real SMS sign-in links. Without these, the link is
   # printed to the server console so the flow stays fully testable locally.
   TWILIO_ACCOUNT_SID=<sid>
   TWILIO_AUTH_TOKEN=<token>
   TWILIO_FROM=<phone number or Messaging Service SID>
   APP_URL=https://<your-deployed-origin>   # where claim links point
   ```

2. Run `supabase/schema.sql` in the Supabase SQL editor (one time). Tables
   are prefixed `vouch_` so they can share a database with other projects.
   The script is idempotent (`create table if not exists` / `add column if
   not exists`), so it's safe to re-run as the schema evolves.

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

Open http://localhost:3000, start a community, and share the invite code.

## Deploying to Vercel

Connect the GitHub repo in the Vercel dashboard (framework auto-detects as
Next.js) and add the environment variables above. Every push to the
production branch redeploys automatically.

## Features

Vouch has grown past a plain directory. The flows below are all live and
covered by the route map further down:

- **Join by name** — type your name and you're in (open communities). Add a
  mobile number to sign in later from any device.
- **Membership gating** — admins can set a community's join policy:
  - `open` — anyone with the invite link joins instantly (default)
  - `admin_approval` — new joiners are *pending* until an admin approves them
  - `approved_list` — joiners whose phone is on the allowlist get in
    instantly; everyone else queues for approval
  Gated communities require a mobile number (it's how members are identified
  and approved).
- **Recommend & vouch** — add a vendor with your first 1–5★ vouch. Adding a
  vendor whose phone already exists routes you to the existing listing instead
  of creating a duplicate.
- **Vouch for others' picks** — one vouch per person per vendor; vouching
  again updates yours. Cards show the average rating, vouch count, who vouched,
  and the latest comment.
- **Ask the group** — post "anyone know a good electrician?" Neighbors reply
  by pointing at an existing vendor or adding a new one, and the asker (or an
  admin) can mark the request answered. Posting copies a WhatsApp-ready
  message to share.
- **Suggest an edit** — fix a vendor's name/category/phone/contact. Admins and
  the member who originally added the vendor apply changes immediately;
  everyone else's edit is queued for admin review.
- **Cross-device sign-in (magic link)** — returning members enter their mobile
  and get a single-use, 15-minute SMS link that signs them in on the new
  device.
- **Claim a seeded identity** — if someone added vouches under your name before
  you joined, typing that name surfaces a "this might be you" prompt so you can
  claim the record and own those vouches.

## How it works

| Route | Purpose |
| --- | --- |
| `/` | Start a community or join with an invite code |
| `/join/[code]` | Shareable invite link — lands on the join form, pre-filled |
| `/c/[code]` | Community directory: search, category filters, vendor list, open requests, admin tools |
| `/c/[code]/add` | Recommend a vendor (includes your first vouch) |
| `/c/[code]/v/[id]` | Vendor detail: contact buttons, all vouches, add/update yours, suggest an edit |
| `/c/[code]/ask/[id]` | "Ask the group" request: responses, recommend existing/new, mark answered |
| `/claim/[token]` | Magic-link landing — signs you in and redirects into the community |

### Identity model

No accounts. When you join a community, the server issues a member record
with a private token, stored in `localStorage` per community
(`vouch_member_{CODE}`). API routes that write data (adding vendors, vouching,
asking, editing) validate the token server-side and check membership status
(`approved` vs `pending`) and role (`admin` vs `member`). Community creators
are admins. Reading a community requires knowing its invite code.

Cross-device sign-in works without any password: a returning member requests
an SMS link tied to the phone on file. The link redeems a single-use,
expiring token (`vouch_login_tokens`) and re-issues the member identity on the
new device. Members with no phone on file (seeded or name-only joiners) can
attach one when they claim their record.

### Database schema (see `supabase/schema.sql`)

- `vouch_communities` — id, name, unique invite code, `join_policy`
- `vouch_members` — per-community identity (name, secret token, optional
  phone, `role`, `status`)
- `vouch_vendors` — name, category, phone, contact, who added them
- `vouch_vouches` — 1–5 star rating + comment, unique per (vendor, member)
- `vouch_vendor_edits` — proposed edits to a vendor's shared fields, awaiting
  admin review (jsonb patch of changed fields only)
- `vouch_login_tokens` — single-use, expiring SMS magic-link tokens
- `vouch_requests` / `vouch_request_vendors` — "ask the group" requests and
  the vendors offered in response
- `vouch_allowed_phones` — per-community allowlist for the `approved_list`
  join policy

All tables have row-level security disabled by design — every read and write
is authorized inside the API routes via token validation, so the anon key is
only ever used server-side.

## Troubleshooting

- **`Error: Cannot find module './XXX.js'` (HTTP 500 on API routes in dev).**
  This is a stale/corrupted `.next` dev-build cache, not a code bug — the
  webpack runtime is referencing a chunk that no longer exists. It commonly
  happens if `next build` runs against the same `.next` folder while
  `next dev` is live. Fix: stop the dev server, delete `.next`, and restart
  (`rm -rf .next && npm run dev`).

## Known limitations

- **Cross-device sign-in needs an SMS provider.** Returning members and anyone
  joining a restricted community sign in via an SMS magic link. Without Twilio
  configured, the link can't be delivered — in local dev it's logged to the
  server console *and* surfaced as a "Dev mode: tap here to sign in" shortcut
  on the "Check your texts!" screen (never in production). A production
  restricted community genuinely requires a delivery channel, since the link
  has to reach a device you don't control. On the device you originally joined
  from, no link is needed — your identity is already in `localStorage`.
- **Claiming a seeded identity is honor-system.** If vouches were added under
  your name before you joined, anyone who types that name can claim the record
  by attaching a phone number — there's no verification of the *first* claim.
  This is an intentional trade-off for low-friction onboarding in a trust
  circle; the captured phone is what secures every sign-in afterward.
- **The directory loads behind the join gate.** For a non-member, vendor data
  is fetched and present in the DOM beneath the join modal. Access is scoped by
  knowing the invite code, not by hiding the markup — fine for an
  invite-semi-public directory, but not a hard paywall.
- **Pending members can open the add/vouch forms by direct link.** The
  directory shows pending members a "you're on the list" wait screen, but
  visiting `/c/[code]/add` or a vendor page directly still renders the form;
  the write is rejected server-side (403) on submit rather than gated up front.
- **No self-service account or community management yet.** There's no way for a
  member to leave a community or for anyone to delete a community; cleanup is a
  manual database operation.

## Roadmap ideas

- Photos on vouches
- "I hired them" follow-ups and job-cost ranges
- Notifications when a request matches a category you can answer
- Season/seasonal arc of most-vouched pros
