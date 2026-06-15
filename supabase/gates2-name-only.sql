-- One-off: switch the GATES2 community to "no gate, name-only sign-on" for testing.
--   join_policy   = 'open'  -> admin verification off (anyone with the link joins)
--   signon_method = 'off'   -> no phone/email collected, no magic-link sign-in
--
-- Run in the Supabase SQL editor (Dashboard -> SQL -> New query). Safe to re-run.
-- The first two statements ensure the sign-on columns exist, so this works whether
-- or not supabase/schema.sql has been applied yet.

alter table vouch_communities add column if not exists signon_method text not null default 'phone';
alter table vouch_members     add column if not exists email text;

update vouch_communities
set join_policy   = 'open',
    signon_method = 'off'
where code = 'GATES2'
returning code, name, join_policy, signon_method;

-- Optional: let in anyone left 'pending' from a previous admin-approval setting.
-- Uncomment to run.
-- update vouch_members
-- set status = 'approved'
-- where community_id = (select id from vouch_communities where code = 'GATES2')
--   and status = 'pending';
