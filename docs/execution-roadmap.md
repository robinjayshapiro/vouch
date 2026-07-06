# Execution roadmap — audit + ranked moves

Written 2026-07-06 from a full audit of the repo, git history, session patterns, and
live-product state. Companion files: `CLAUDE.md` (how to work here),
`docs/open-tasks.md` (task-level punch list). This file is strategy: what to do next
and why, ordered by expected return. Each move is written so a less capable model can
execute it — the "Tell the model" block is the literal prompt to give it.

---

## The audit, in short

**Projects.** One product (Vouch, live at vouch.business), one real community
seeded and waiting (Gates Ridge: 59 members, ~128 vendors, 129 vouches), plus test
communities. The product is genuinely further along than the traction: auth, join
policies, moderation, notifications, seeding pipeline all work.

**Offers & pricing.** None — the product is free and has no revenue surface. That is
*correct* today: there is no retention evidence to price against. The mistake to avoid
is building monetization before activation. Trigger to revisit: two communities with
30-day retained usage (members returning without prompting). The likely first offer at
that point is community-pays (organizer/HOA, ~$10–30/mo per community), not
member-pays — the buyer is whoever feels the pain of organizing, and members must
never hit a paywall in a trust product.

**Workflows.** Session-driven development with strong written memory
(open-tasks.md, as-built docs) — this is a real strength, keep it. Weaknesses: no
tests/CI (the build is the only gate), no analytics of any kind, and until today no
codified procedures — every session re-derived the ship ritual, the seeding rules,
and the env-debug checklist from scratch.

**Where the time actually went** (readable from git history and sessions):
1. Environment/config debugging — the Resend/env-var saga consumed roughly a full
   session on what is a 10-minute checklist (now `/env-doctor`).
2. Live-data surgery — the GATES/GATES2 seeding-and-reseeding cycle: FK 23503
   failures, duplicate-vouch collisions, multiple ad-hoc fix scripts (now
   `/community-ops`).
3. Shipping mechanics — repeated every session (now `/ship`).
4. Feature building ahead of usage — notifications, identity chip, voucher filter are
   fine; but the backlog (messaging, display-name privacy) is growing faster than the
   user count, which is currently ~1.

**The single most important fact:** Gates Ridge is seeded but not activated. 59
neighbors exist as rows; approximately none have claimed their identity or opened the
app. Every hour spent on anything else is spent on inventory for a store that hasn't
opened.

---

## Ranked moves

### 1. Activate Gates Ridge (highest expected return, by far)

**Why.** The entire thesis — "people will use a private, vouched vendor list from
neighbors they know" — is untested. The pilot is fully built and fully seeded; the
remaining work is distribution, which costs hours, not weeks. Until this happens, no
other work has feedback attached to it. If activation fails, that's the cheapest
possible time to learn why.

**Steps.**
1. Get the organizer's exact join name; promote them to admin (SQL pattern in
   `docs/open-tasks.md` and `/community-ops`).
2. Send the organizer note (already written: session artifact `gates-onboarding.md`)
   and the member note (`scripts/gates-member-onboarding.md`) for them to forward to
   the neighborhood WhatsApp/email list.
3. Generate personal claim links for all 59 seeded members
   (`scripts/gates-claim-links.mjs` pattern — confirm before running; it writes
   tokens) so each neighbor's first tap lands them signed in as themselves.
4. Measure weekly (see Move 2).
5. One nudge cycle after ~2 weeks: organizer re-forwards to non-claimers.

**Done looks like.** Within 30 days: ≥20 of 59 members claimed; ≥10 new vouches or
"Ask the group" requests from people other than Robin; the organizer has used an
admin feature once.

**Tell the model.** "Read CLAUDE.md and use the community-ops skill. Do not build any
features. Task: [promote X to admin / generate claim links for GATES / report GATES
activity]. Show me every SQL statement or script dry-run before applying."

### 2. Build the weekly numbers habit (cheap, compounding)

**Why.** There is zero visibility today — no analytics, no counts, nothing but Vercel
request logs. Move 1 is an experiment; without measurement it produces anecdotes.
This is one read-only script, not an analytics platform.

**Steps.**
1. Write `scripts/stats.mjs` (model: `list-gates.mjs`): for a given code print
   members (total / claimed — has phone or email / pending), vendors, vouches,
   open requests, pending edits, and 7-day deltas (all tables have `created_at`).
2. Run it weekly; paste the line into a running log at the bottom of
   `docs/open-tasks.md` (or a `docs/metrics.md`).
3. Optional later: a scheduled session (Routine) that runs it and messages Robin.

**Done looks like.** A dated one-line entry per week, e.g.
`2026-07-13 GATES: 23/59 claimed, 131 vendors, 140 vouches (+11), 3 asks (+3)`.

**Tell the model.** "Read CLAUDE.md. Write a read-only stats script per the
community-ops skill's 'inspect live state' recipe, output one summary line per
community code passed as argv. No writes anywhere. Then run it for GATES and append
the line to the metrics log."

### 3. Fix the first-touch leaks (small, all on the activation path)

**Why.** Move 1 pushes ~59 people through join/claim exactly once each. Known rough
edges on that exact path waste irreplaceable first impressions. All are small,
already itemized in `docs/open-tasks.md`, and safe for a weaker model with the
CLAUDE.md quality bars.

**Steps** (one PR each, `/ship` to land):
1. Transactional email/SMS copy polish (`lib/email.ts`, `lib/sms.ts`) — warm voice
   matching the app; consider simple HTML for Resend.
2. Decline-member UX — declined members currently get silently dumped back to the
   join gate with no explanation; show a clear message.
3. The 5-char code prefetch quirk (`LandingPage.tsx` — `length === 6` → `>= 5`;
   GATES is 5 chars). Also fix `lib/identity.ts::getStoredCommunities` which filters
   to exactly-6-char codes and therefore hides GATES from "Your communities".
4. Claim-flow read-through: follow a claim link in dev end-to-end and fix any copy
   or dead-end found.

**Done looks like.** Each item checked off in open-tasks.md; `tsc` + build green;
a dev walkthrough of join → claim → vouch with no confusing screen.

**Tell the model.** "Read CLAUDE.md fully. Implement item [N] from
docs/open-tasks.md 'Polish'. Meet every checkbox in the CLAUDE.md quality bar for
UI changes. Open a PR but do not merge."

### 4. Second community, only after Gates shows signal

**Why.** One community proves the product works; two prove the *playbook* works —
that seeding + onboarding + activation is repeatable without heroics. The pipeline
(gen-SQL generator, type-map, claim links, onboarding notes) is now generic enough
that community #2 should cost an evening. **Deliberately sequenced after Move 1
shows signal** — a second empty community doubles inventory, not learning.

**Steps.** Recruit one organizer from Robin's network with an existing vendor list →
run the `/community-ops` seeding recipe with a new code → reuse the onboarding notes
with names swapped → same weekly stats line.

**Done looks like.** Second community live with its own organizer-admin, ≥15 claimed
members in its first 30 days, seeded entirely via the documented pipeline with zero
new ad-hoc scripts.

### 5. Light error observability (do opportunistically)

**Why.** `lib/notify.ts` failures vanish into `console.error`; with real users,
silent notification failures become invisible churn. But don't buy a platform for a
59-person pilot.

**Steps.** Vercel's built-in log view is adequate now; when Move 1 is live, add a
weekly log skim for `[notify]`/error lines to the stats ritual. Sentry only when
there are multiple active communities.

---

## The three things to stop doing

### Stop 1: Stop building features ahead of usage evidence

The backlog is growing faster than the user base. In-app messaging and display-name
privacy are already queued; the voucher-filter and identity-chip features shipped
this week — all reasonable ideas, and all guesses, because approximately zero
end-users have touched the product. Features built before usage have three costs
that compound: (a) they're specified from imagination rather than observed behavior,
so a meaningful fraction will be wrong and need rework; (b) each one permanently
enlarges the surface a session must understand and not break — more routes, more
states, more quality-bar checklist to hold; (c) they consume the scarcest resource
(Robin's session time) on the thing with the *least* information return, while the
thing with the *most* information return — putting the app in 59 neighbors' hands —
sits ready and unshipped. The discipline: until Gates is activated, nothing gets
built unless a real member asked for it or it directly blocks activation (Move 3
qualifies; messaging does not). Ideas still get captured — in `docs/open-tasks.md`,
tagged with who asked — capture is cheap, building is not.

### Stop 2: Stop doing live-data surgery interactively

The Gates seeding history is the cautionary tale: hand-run SQL in the Supabase
editor, an FK 23503 failure mid-delete, duplicate-vouch constraint violations,
GATES2 remnants, and a pile of one-off fix scripts with hardcoded codes. Every
interactive prod-data session has the same shape: no dry run, no transaction
discipline until something breaks, and no record of what was actually executed.
That was survivable when the rows were test data; from Move 1 onward those rows are
real neighbors' names, tokens, and vouches — an errant delete is not re-seedable,
it's a betrayal of the exact trust the product sells. And there is only one
database; every experiment is a production experiment. The replacement is already
built: the `/community-ops` lane — reads freely, writes only via idempotent
transaction-wrapped SQL or dry-run-first scripts, always shown before applying.
The rule: if a change to live data isn't going through that lane, it doesn't happen.

### Stop 3: Stop spending premium-model sessions on mechanical work

A large, measurable share of past session time went to work that requires no
judgment: the ship ritual, env-var triage, seed-file regeneration, copy tweaks,
backlog bookkeeping. That work used to *need* a strong model because the procedures
lived nowhere except previous chats — every session re-derived them, and a weaker
model would have re-derived them wrong (the env saga is exactly what that looks
like). That constraint is now gone: CLAUDE.md encodes the judgment (named mistakes,
quality bars, escalation rules) and the three skills encode the procedures. Route
accordingly: mechanical sessions (ship, stats, copy, backlog, env triage, seeding
reruns) go to a cheaper/faster model instructed to follow the manual and skills
literally; premium sessions are reserved for what actually needs them — new feature
design, security-sensitive auth changes, debugging something the manual doesn't
cover. The corollary discipline: when a cheap-model session stumbles, the fix is
usually not "use the big model next time" — it's "the manual was missing a rule";
add the rule, and the fleet gets smarter.

---

## Sequencing summary

Week 1: Move 1 steps 1–3 (activate) + Move 2 (stats script).
Weeks 2–4: Move 3 items shipped between stats checks; nudge cycle.
Day 30: read the numbers. Signal → Move 4. No signal → the numbers say why before
any more building.
