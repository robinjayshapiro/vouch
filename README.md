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
  community and carries optional context tags (e.g. Fair Price, Fast Response)
  rather than a star rating. One vouch per person per vendor (vouching again
  updates yours). Invite codes use an unambiguous alphabet (no 0/O or 1/I/L) so
  they're easy to read over the phone.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS 3.4](https://tailwindcss.com/) for styling
- [Supabase](https://supabase.com/) (Postgres) — all access goes through
  server-side API routes; no keys are exposed to the browser

## Getting started

1. Create a `.env.local` with your Supabase project credentials:

   ```
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   ```

   Optionally add credentials for the sign-in channels an admin can enable
   (without them, magic-link messages are logged to the server console so the
   flow still works in dev):

   ```
   # Phone sign-on (SMS magic links via Twilio)
   TWILIO_ACCOUNT_SID=<sid>
   TWILIO_AUTH_TOKEN=<token>
   TWILIO_FROM=<your Twilio number or Messaging Service SID>
   # Email sign-on (magic links via Resend)
   RESEND_API_KEY=<key>
   RESEND_FROM=<a verified sender address>
   # Where claim links point in production
   APP_URL=https://<your-deployment>
   ```

2. Run `supabase/schema.sql` in the Supabase SQL editor (one time). Tables
   are prefixed `vouch_` so they can share a database with other projects.

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

Open http://localhost:3000, start a community, and share the invite code.

## Deploying to Vercel

Connect the GitHub repo in the Vercel dashboard (framework auto-detects as
Next.js) and add the two environment variables above. Every push to `master`
redeploys automatically.

## How it works

| Route | Purpose |
| --- | --- |
| `/` | Start a community or join with an invite code |
| `/c/[code]` | Community directory: search, category filters, vendor list |
| `/c/[code]/add` | Recommend a vendor (includes your first vouch) |
| `/c/[code]/v/[id]` | Vendor detail: contact buttons, all vouches, add/update yours |

### Identity model

No accounts. When you join a community, the server issues a member record
with a private token, stored in `localStorage` per community
(`vouch_member_{CODE}`). API routes that write data (adding vendors,
vouching) validate the token server-side. Reading a community requires
knowing its invite code.

Admins choose a **sign-on mechanism** per community (Settings → "How do members
sign in?"), independent of the approval policy:

- **Phone** — collect a mobile; returning members sign in via a texted magic
  link (Twilio).
- **Email** — collect an email; returning members sign in via an emailed magic
  link (Resend).
- **Off** — name only; no magic-link sign-in.

A magic link opened in the same browser restores the member from `localStorage`,
so there's no re-authentication on that device. A phone is also collected (in
addition to the sign-on contact) when the **Approved phone list** policy is on,
since that allowlist matches on phone number.

### Database schema (see `supabase/schema.sql`)

- `vouch_communities` — id, name, unique invite code
- `vouch_members` — per-community identity (name + secret token)
- `vouch_vendors` — name, category, phone, contact, who added them
- `vouch_vouches` — contextual tags (`text[]`, see `lib/tags.ts`) + comment,
  unique per (vendor, member). The legacy `rating` column is retained but unused.

## Roadmap ideas

- Share links with the code embedded (`/join/CODE`)
- Photos on vouches
- "I hired them" follow-ups and job-cost ranges
- Magic-link auth for cross-device identity
