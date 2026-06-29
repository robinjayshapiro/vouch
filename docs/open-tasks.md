# Open tasks

A session-agnostic punch list. To pick up context in a new session, read this file and
`CLAUDE.md`. Check off items as they ship.

---

## High priority

### Gates Ridge — promote admin
The head of the Gates Ridge Civic Association community needs to be made an admin once
they join and share their exact display name. Run this SQL in the Supabase editor:

```sql
update vouch_members
set role = 'admin'
where community_id = (select id from vouch_communities where code = 'GATES')
  and name = 'Their Exact Name';
```

They won't see ⚙️ / 🛠️ buttons until this is done.

---

## Polish

### Transactional email/SMS copy
`lib/email.ts` and `lib/sms.ts` — subject lines and body text are functional but plain.
Revisit voice, subject lines, and formatting. Consider HTML email for the Resend path
(currently plain text). Tracked in `README.md` under **Action items**.

### Decline-member UX
When an admin declines a join request, the row is silently deleted and the person lands
back at the join gate with no explanation. Should surface a clear "your request was not
approved" message instead.

---

## Deferred features

### Phone (Twilio) sign-on
Twilio credentials not configured yet. SMS delivery (`lib/sms.ts`) is implemented and
tested via console logs; just needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM` set in Vercel env vars (Production scope) + a redeploy.

### Dev sign-in tap-here shortcut (see plan file)
Without Twilio/Resend configured in local dev, magic links are only logged to the server
console. A plan exists (`~/.claude/plans/…`) to surface a "Dev mode: tap here to sign in"
link on the `sent` screen when `process.env.NODE_ENV !== 'production'` and the provider
reported `devLogged`. Also covers a moderation-doc update and README "Known limitations"
section. Implement on the current branch or a fresh one off master.

### Error observability
No Sentry or Vercel Log Drains set up. Notification failures (`lib/notify.ts`) are
currently logged via `console.error` and silently swallowed — fine for now but will be
invisible in production at scale.

### In-app messaging between members
Let members DM each other inside a community without exchanging phone numbers. Needs a
`vouch_messages` table (sender_id, recipient_id, community_id, body, created_at), a
conversation thread UI, and a notification path (email/SMS to the recipient if they have
a contact on file). Significant feature — design data model before implementing.

### Display-name privacy (first name + last initial)
Members sign up with their full name but may prefer to appear publicly as "Robin S."
Two modes to consider:
- **User-controlled**: each member sets their own display preference.
- **Admin-enforced**: community admin requires everyone to appear as first + last initial
  (trust vs. privacy trade-off).
Needs a `display_name` column on `vouch_members` (nullable; full name used if null), and
a setting in `SettingsPanel` for the community-wide enforcement toggle.

### "My communities" on the homepage
Landing page could list communities the visitor has already joined (read from localStorage)
with a one-tap link back. No server call needed — tokens are stored client-side under
`vouch_member_{CODE}`. Small addition to `LandingPage.tsx`.

---

## Minor / housekeeping

### 5-char invite code prefetch quirk
`LandingPage.tsx:41` only fetches the community config (for contact-field rendering) when
the typed code is exactly 6 chars. GATES is 5 chars, so the prefetch never fires. Harmless
for name-only open communities but slightly inconsistent. Fix: change the `length === 6`
guard to `length >= 5`.

### Stale remote branches
Old `claude/*` branches from merged PRs accumulate on GitHub. Either enable "Automatically
delete head branches" in repo Settings, or periodically `git push origin --delete
claude/<branch>` for merged ones. (Push-delete from the sandbox returns 403 — do it from
the GitHub UI or enable the auto-delete setting.)

---

## Reference

- Invite link for Gates: `https://vouch.business/join/GATES`
- Admin SQL pattern: `update vouch_members set role = 'admin' where community_id = (...) and name = '...'`
- Schema re-run: `supabase/schema.sql` — all `add column if not exists`, safe to re-run
- Seed generator: `node scripts/gen-gates-sql.mjs > supabase/seed-gates.sql` (input: `scripts/gates-data.json`, both gitignored)
