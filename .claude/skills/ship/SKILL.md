---
name: ship
description: End-of-session ship ritual for Vouch — verify, commit, push, PR, squash-merge, post-merge checks. Use when Robin says "merge", "ship it", "let's merge this in", or when finished work needs to land on master.
---

# Ship — land the current branch on master

Robin saying "merge" authorizes this whole ritual once. Do not re-ask at each step.
If Robin has NOT said merge, stop after step 6 (PR created) and ask.

## 1. Preflight

```
git status
git log --oneline -8
git fetch origin master
```

- Working tree must be clean. Uncommitted work: commit it first (imperative subject
  ≤72 chars, body says why, session trailer per repo convention).
- If `origin/master` moved ahead, rebase: `git rebase origin/master`.

## 2. Rebase-resurrection check (mandatory after any rebase)

```
git diff origin/master --stat
```

Read the file list. Every file must be an intended change. This repo once had a rebase
resurrect a deleted debug endpoint (git dropped the "remove" commit as already-upstream
but kept the "add"). If an unexpected file appears: `git rm` it, commit with a body
explaining the resurrection, re-run this check.

## 3. Gates

```
npx tsc --noEmit
npm run build
```

Both must pass. Phantom errors referencing `.next/types/...` for deleted files →
`rm -rf .next` and re-run. **Never run `npm run lint`** (unconfigured, hangs on an
interactive prompt).

## 4. PII sweep

`git diff origin/master --stat` again and scan names: anything that could hold real
contact data (seed SQL, exported data, generated lists) must be gitignored, not
tracked. Known-ignored: `scripts/gates-data.json`, `supabase/seed-gates.sql`.

## 5. Push

```
git push -u origin <branch>
```

After a rebase use `--force-with-lease` (never bare `--force`). On network failure
retry with backoff: 2s, 4s, 8s, 16s.

## 6. PR

Create via the GitHub MCP tools (`mcp__github__create_pull_request`), base `master`.
No PR template exists — write: `## Summary` (bulleted, what and why) and
`## Test plan` (checkboxes: gates run, manual checks done/pending).

**If the diff touches `supabase/schema.sql`:** add a bold line at the top of the PR
body: **"Run `supabase/schema.sql` in the Supabase SQL editor before/with this
deploy"** — routes read new columns at runtime and prod will 500 or silently drop
saves without it.

Stop here if Robin hasn't explicitly approved merging.

## 7. Merge

`mcp__github__merge_pull_request` with `merge_method: "squash"`. Squash is the repo
standard.

## 8. Post-merge

1. Tell Robin: merged, Vercel is auto-deploying master, and restate the schema.sql
   step if there was one (this is Robin's manual step — don't let it get lost).
2. Restart the working branch for follow-up work:
   `git fetch origin master && git checkout -B <branch> origin/master`
   then `git push --force-with-lease -u origin <branch>` (safe: branch now contains
   only merged history).
3. Update `docs/open-tasks.md`: remove items this PR closed, add anything discovered
   but deferred. Commit that on the fresh branch if there are changes.

## Failure modes

- **Merge API returns 405/409 (not mergeable):** rebase onto master, re-run steps 2–5,
  try again.
- **Vercel deploy fails after merge:** read the build log, fix forward on the fresh
  branch, ship again — don't revert master unless the site is actually down.
- **Robin reports prod behaving oddly right after deploy:** first suspects are (a)
  schema.sql not yet run in Supabase, (b) env vars missing/mis-scoped — see the
  `env-doctor` skill.
