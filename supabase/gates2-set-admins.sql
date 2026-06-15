-- Inspect and set admins for the GATES2 community (user testing).
-- An admin is simply a vouch_members row with role = 'admin'. The app checks
-- admin rights server-side as token -> member -> role, and each person holds
-- their own member token in localStorage from when they joined.
--
-- ORDER OF OPERATIONS:
--   1. Have each tester open GATES2 and join (name only, since sign-on is 'off')
--      so their member row exists.
--   2. Run STEP A to see the roster and copy the exact names (or ids).
--   3. Run STEP B (by name) or STEP C (by id) to promote them.
--
-- Run in the Supabase SQL editor (Dashboard -> SQL -> New query).

-- STEP A — who's in GATES2 and what role they have right now:
select id, name, role, status, phone, email, created_at
from vouch_members
where community_id = (select id from vouch_communities where code = 'GATES2')
order by created_at;

-- STEP B — promote by name (edit the names to match STEP A exactly):
-- update vouch_members
-- set role = 'admin'
-- where community_id = (select id from vouch_communities where code = 'GATES2')
--   and name in ('Robin Shapiro', 'Other Tester')
-- returning id, name, role;

-- STEP C — promote by id (safer if names repeat; paste ids from STEP A):
-- update vouch_members
-- set role = 'admin'
-- where id in ('00000000-0000-0000-0000-000000000000',
--              '11111111-1111-1111-1111-111111111111')
-- returning id, name, role;

-- To demote someone later: set role = 'member' with the same WHERE clause.
