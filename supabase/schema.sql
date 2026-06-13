-- Vouch — Supabase Schema
-- Run this in the Supabase SQL editor.
-- Tables are prefixed vouch_ so they coexist with other projects
-- (e.g. Bracket Beat) in the same Supabase database.

create table if not exists vouch_communities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists vouch_communities_code_idx on vouch_communities(code);

create table if not exists vouch_members (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references vouch_communities(id) on delete cascade,
  name         text not null,
  token        uuid unique not null,
  created_at   timestamptz not null default now()
);

create index if not exists vouch_members_community_idx on vouch_members(community_id);

create table if not exists vouch_vendors (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references vouch_communities(id) on delete cascade,
  name         text not null,
  category     text not null,
  phone        text,
  contact      text,
  added_by     uuid not null references vouch_members(id),
  created_at   timestamptz not null default now()
);

create index if not exists vouch_vendors_community_idx on vouch_vendors(community_id);

create table if not exists vouch_vouches (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vouch_vendors(id) on delete cascade,
  member_id  uuid not null references vouch_members(id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (vendor_id, member_id)
);

create index if not exists vouch_vouches_vendor_idx on vouch_vouches(vendor_id);

-- Mobile number for cross-device sign-in (SMS magic links). Nullable:
-- seeded members and name-only joiners have none until they claim one.
alter table vouch_members add column if not exists phone text;

-- Role for moderation. Community creators are 'admin'; everyone else 'member'.
alter table vouch_members add column if not exists role text not null default 'member';

-- Proposed edits to a vendor's shared fields, awaiting admin review.
-- `changes` is a jsonb patch of only the fields being changed.
create table if not exists vouch_vendor_edits (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references vouch_communities(id) on delete cascade,
  vendor_id    uuid not null references vouch_vendors(id) on delete cascade,
  proposed_by  uuid not null references vouch_members(id),
  changes      jsonb not null,
  status       text not null default 'pending', -- 'pending'|'approved'|'rejected'
  reviewed_by  uuid references vouch_members(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists vouch_vendor_edits_community_idx
  on vouch_vendor_edits(community_id, status);

-- Single-use, expiring tokens delivered by SMS to sign a member in on a new
-- device. Channel-agnostic — email links could reuse this table later.
create table if not exists vouch_login_tokens (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references vouch_members(id) on delete cascade,
  token      uuid unique not null default gen_random_uuid(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vouch_login_tokens_member_idx on vouch_login_tokens(member_id);

-- "Ask the group" requests. A member asks for a category of pro; responses
-- are vendors linked via vouch_request_vendors (new or existing listings).
create table if not exists vouch_requests (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references vouch_communities(id) on delete cascade,
  category     text not null,
  note         text,
  asked_by     uuid not null references vouch_members(id),
  status       text not null default 'open', -- 'open'|'closed'
  created_at   timestamptz not null default now()
);
create index if not exists vouch_requests_community_idx on vouch_requests(community_id, status);

create table if not exists vouch_request_vendors (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references vouch_requests(id) on delete cascade,
  vendor_id   uuid not null references vouch_vendors(id) on delete cascade,
  member_id   uuid not null references vouch_members(id),
  created_at  timestamptz not null default now(),
  unique (request_id, vendor_id)
);
create index if not exists vouch_request_vendors_request_idx on vouch_request_vendors(request_id);

-- Membership gating. join_policy controls how new members get in:
--   'open'           — anyone with the invite link (default)
--   'admin_approval' — new joiners are pending until an admin approves
--   'approved_list'  — joiners whose phone is on vouch_allowed_phones get in
--                      instantly; everyone else queues for admin approval
alter table vouch_communities add column if not exists join_policy text not null default 'open';
alter table vouch_members add column if not exists status text not null default 'approved';

create table if not exists vouch_allowed_phones (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references vouch_communities(id) on delete cascade,
  phone        text not null,
  created_at   timestamptz not null default now(),
  unique (community_id, phone)
);
create index if not exists vouch_allowed_phones_community_idx on vouch_allowed_phones(community_id);

-- All access is enforced in API routes (token validation).
-- Disable RLS so the anon key can read/write from server-side routes.
alter table vouch_communities  disable row level security;
alter table vouch_members      disable row level security;
alter table vouch_vendors      disable row level security;
alter table vouch_vouches      disable row level security;
alter table vouch_login_tokens disable row level security;
alter table vouch_vendor_edits disable row level security;
alter table vouch_requests        disable row level security;
alter table vouch_request_vendors disable row level security;
alter table vouch_allowed_phones  disable row level security;
