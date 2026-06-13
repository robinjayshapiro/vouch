# Roles & Moderation — design

Status: **design only, not yet implemented.** Captures what's needed to let
members fix vendor details (feature idea #3) without letting anyone silently
rewrite shared data. Written so it can be picked up cleanly later.

## The problem

Today every member is equal and there are no admins. Vouches are safe to leave
open — they're additive and attributed to a name ("Vouched by Brett R."), so a
bad one is visible and self-correcting. **Vendor core fields (name, phone,
category, contact) are different: they're shared/canonical.** One person's edit
changes what the whole community sees, and our imported Gates data has rough
entries (vendors named just "Mario", contact names in the wrong field). We want
edits to be possible but reviewed.

## Roles

Add a role to members; default everyone to `member`, mark trusted people
`admin`. The community creator becomes an admin automatically.

```sql
alter table vouch_members add column if not exists role text not null default 'member';
-- values: 'member' | 'admin'
```

- `createCommunity()` in `lib/db.ts` already creates the first member — set
  that member's role to `admin`.
- For the existing GATES2 community, set Robin's member row to `admin` via a
  one-off (same pattern as `scripts/seed-gates.mjs`).
- Admin check is a server-side helper: `getMemberByToken()` → `member.role === 'admin'`.

## What's open vs. what needs approval

| Action | Policy |
| --- | --- |
| Add a vendor | Open (additive, attributed) |
| Add / update **your own** vouch | Open (already attributed) |
| Edit vendor core fields | **Proposed → admin approves**, unless the editor is an admin or the vendor's original `added_by` (they own what they entered) — those apply immediately |
| Delete / merge a vendor | Admin only |

The `added_by`-applies-immediately rule keeps the queue small: most fixes come
from the person who added the entry.

## Moderation queue (schema)

One table for proposed vendor edits. `changes` is a jsonb patch of only the
fields being changed, which keeps it flexible and future-proof.

```sql
create table if not exists vouch_vendor_edits (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references vouch_communities(id) on delete cascade,
  vendor_id    uuid not null references vouch_vendors(id) on delete cascade,
  proposed_by  uuid not null references vouch_members(id),
  changes      jsonb not null,           -- e.g. {"name":"Mario's Tile","phone":"516-450-1816"}
  status       text not null default 'pending', -- 'pending'|'approved'|'rejected'
  reviewed_by  uuid references vouch_members(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists vouch_vendor_edits_community_idx
  on vouch_vendor_edits(community_id, status);
alter table vouch_vendor_edits disable row level security;
```

Generalization note: if delete/merge later also need review, either add a
`kind` column here or add sibling tables. Start with edits only.

## API (follows existing try/catch + token-validation pattern)

- `POST /api/vendors/[id]/edit` — body `{ code, token, changes }`. Resolve
  member; if admin or `vendor.added_by === member.id`, apply `changes` to
  `vouch_vendors` directly and return `{ applied: true }`. Otherwise insert a
  `pending` row and return `{ pending: true }`.
- `GET /api/communities/[code]/moderation` — admin only. Returns pending edits
  joined with current vendor values (so the UI can show a before/after diff)
  and the proposer's name.
- `POST /api/moderation/[id]` — admin only. `{ token, action: 'approve'|'reject' }`.
  Approve applies `changes` to the vendor and marks the row `approved`; reject
  marks `rejected`. Record `reviewed_by`/`reviewed_at`.

## UI

- **Vendor detail** (`VendorClient.tsx`): a "Suggest an edit" affordance opening
  a small form (name / phone / category / contact). On submit, show either
  "Saved" (applied) or "Sent to an organizer for review" (pending).
- **Community page** (`CommunityClient.tsx`): for admins only, a "Review
  changes (N)" entry that opens a moderation list with before/after and
  Approve / Reject buttons.
- Non-admins never see moderation UI; the admin entry is gated on a role flag
  returned by an existing community fetch.

## Optional, later

- Notify admins of pending items — reuse the delivery seam already built
  (`lib/sms.ts`, `lib/email.ts`).
- Conflict handling if a vendor changes while an edit is pending (currently
  approve simply overwrites — acceptable for now).
- Audit view of approved/rejected history (the columns already support it).

## Rollout order

1. Add `role` column; make creators admins; set GATES2 admin(s).
2. Add `vouch_vendor_edits`; build the edit endpoint with the
   admin/`added_by` fast-path.
3. Build the moderation list + approve/reject.
4. Add "Suggest an edit" to vendor detail.
