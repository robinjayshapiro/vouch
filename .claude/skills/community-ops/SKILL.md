---
name: community-ops
description: Safe Supabase data operations for Vouch communities — seed a community from a spreadsheet, promote admins, generate claim links, delete/reset a community, inspect live data. Use for any request that reads or writes live community/member/vendor rows.
---

# Community ops — live-data operations, done safely

Everything here touches the production database (there is only one database).
**Hard rule: show Robin the exact SQL or the dry-run output and get an explicit yes
before any write.** Reads are fine without asking.

## How writes are executed (two lanes)

1. **Generated SQL for the Supabase editor** — for big, atomic operations (seeding,
   deletion). Emit ONE self-contained file: `begin;` … `commit;`, idempotent
   (delete-then-insert), every uuid pre-generated with `randomUUID()` in JS so the SQL
   has no ordering dependencies. Robin pastes it into the Supabase SQL editor.
2. **`scripts/*.mjs` via the anon key** — for smaller or repeatable operations. Copy
   the boilerplate from any existing script: hand-rolled `.env.local` parser (no
   dotenv), `createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)`. Destructive
   scripts are **dry-run by default, `--apply` to write**, and print exactly what they
   did/would do.

## The FK trap (this has bitten before — error 23503)

`on delete cascade` covers containment (community → members/vendors/…, vendor →
vouches). It does NOT cover authorship references to `vouch_members`:

- `vouch_vendors.added_by`
- `vouch_vendor_edits.proposed_by`, `vouch_vendor_edits.reviewed_by`
- `vouch_requests.asked_by`
- `vouch_request_vendors.member_id`

Any delete that removes members (including deleting a whole community) must clear
those rows explicitly FIRST. Canonical preamble (parameterize the codes):

```sql
delete from vouch_request_vendors
 where request_id in (select r.id from vouch_requests r join vouch_communities c on c.id = r.community_id where c.code in ('CODE'))
    or vendor_id  in (select v.id from vouch_vendors v  join vouch_communities c on c.id = v.community_id where c.code in ('CODE'))
    or member_id  in (select m.id from vouch_members m  join vouch_communities c on c.id = m.community_id where c.code in ('CODE'));
delete from vouch_vendor_edits
 where community_id in (select id from vouch_communities where code in ('CODE'))
    or proposed_by in (select m.id from vouch_members m join vouch_communities c on c.id = m.community_id where c.code in ('CODE'))
    or reviewed_by in (select m.id from vouch_members m join vouch_communities c on c.id = m.community_id where c.code in ('CODE'));
delete from vouch_requests where community_id in (select id from vouch_communities where code in ('CODE'));
delete from vouch_communities where code in ('CODE');  -- cascades the rest
```

## Recipes

### Seed a community from a spreadsheet (the Gates pipeline)
1. Parse the uploaded xlsx/csv to `scripts/<name>-data.json`, rows shaped
   `{type, name, contact, phone, recommender, notes}`. **Gitignore the JSON in the
   same commit** — it's real contact data.
2. Map free-text types to category ids with `scripts/type-map.mjs::mapType` — extend
   its ordered `RULES` regex list for new vendor types (first match wins; order
   matters; fall-through is `'other'`; every id must pass `isValidCategory`).
3. Generate SQL with a generator modeled on `scripts/gen-gates-sql.mjs`:
   - community insert (choose `join_policy`, `signon_method` with Robin)
   - one member per unique recommender (`role='member'`, `status='approved'`,
     fresh uuid token each)
   - vendors deduped by `phoneDigits` last-10 (≥7 digits to count as a phone)
   - vouches deduped on `(vendor_id, member_id)` — unique constraint; merge comments
     when the same person lists the same vendor twice
   - the FK-trap delete preamble up top so the file is safe to re-run
4. Output to `supabase/seed-<name>.sql`, **gitignore it**, hand to Robin to run.
5. Verify after Robin runs it: read-only script counting members/vendors/vouches for
   the code (model: `scripts/list-gates.mjs`).

### Promote an admin
Member must exist first (they join themselves; get the exact display name from Robin).
```sql
update vouch_members set role = 'admin'
where community_id = (select id from vouch_communities where code = 'GATES')
  and name = 'Exact Name As Joined';
```
Confirm afterwards with a select. Admins see ⚙️/🛠️ on next page load — no re-login
needed.

### Generate claim links for seeded members
Model: `scripts/gates-claim-links.mjs`. Mints `vouch_login_tokens` rows (long TTL,
e.g. 30 days) and prints `Name<TAB>link` rows for Robin to text/WhatsApp out. Each
link signs the recipient in as that member. This WRITES tokens — confirm first.
Never commit the output.

### Inspect live state (no approval needed)
Read-only script (model: `scripts/list-gates.mjs` / `check-gates-policy.mjs`): look up
community by code, count members by status, vendors, vouches, open requests, pending
edits. Useful as a pre/post check around any write.

### Fix miscategorized vendors after a taxonomy change
Model: `scripts/remap-categories.mjs` — recover the source type from the seed JSON
(match by phone digits, then name), recompute with current `mapType`, dry-run prints
the change list, `--apply` writes.

## Non-negotiables

- One database. There is no staging. Treat every write as production.
- Never `update`/`delete` without a `community_id`/`code` scope in the WHERE clause.
- Members' `token` values are credentials — never print them in output Robin will
  paste anywhere public; claim links are the sanctioned way to hand out access.
- After any schema change lands in `supabase/schema.sql`, it does not exist in prod
  until Robin runs it. Sequence: schema first, then code deploy, then data scripts.
