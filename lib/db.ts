import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type {
  Community,
  JoinPolicy,
  Member,
  MemberStatus,
  MemberSuggestion,
  PendingMember,
  PendingVendorEdit,
  RequestDetail,
  RequestStatus,
  RequestSummary,
  SignonMethod,
  Vendor,
  VendorEditChanges,
  VendorWithStats,
  VouchRequest,
  VouchWithMember,
} from '@/types';
import { getCategory, isValidCategory } from '@/lib/categories';

// Phones are the natural dedup key ("here's his number") — compare on the
// last 10 digits so formatting and country-code prefixes don't matter.
export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-10);
}

// Emails are matched case-insensitively with surrounding whitespace trimmed,
// the email analogue of phoneDigits().
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// Unambiguous alphabet: no 0/O, 1/I/L so codes are easy to read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export async function createCommunity(
  name: string,
  creatorName: string
): Promise<{ community: Community; member: Member }> {
  const db = getClient();
  let community: Community | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from('vouch_communities')
      .insert({ name, code: randomCode() })
      .select()
      .single();
    if (!error) {
      community = data as Community;
      break;
    }
    if (error.code !== '23505') throw new Error(error.message); // retry only on code collision
  }
  if (!community) throw new Error('Could not generate a unique invite code.');
  const member = await joinCommunity(community.id, creatorName);
  // The creator runs the community — make them an admin.
  await db.from('vouch_members').update({ role: 'admin' }).eq('id', member.id);
  member.role = 'admin';
  return { community, member };
}

export async function getCommunityByCode(
  code: string
): Promise<Community | undefined> {
  const { data, error } = await getClient()
    .from('vouch_communities')
    .select()
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Community | null) ?? undefined;
}

export async function joinCommunity(
  communityId: string,
  name: string,
  phone?: string | null,
  status: MemberStatus = 'approved',
  email?: string | null
): Promise<Member> {
  const { data, error } = await getClient()
    .from('vouch_members')
    .insert({
      community_id: communityId,
      name,
      token: randomUUID(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      status,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Member;
}

// Membership gating helpers ────────────────────────────────────────────────

export async function setJoinPolicy(
  communityId: string,
  policy: JoinPolicy
): Promise<void> {
  const { error } = await getClient()
    .from('vouch_communities')
    .update({ join_policy: policy })
    .eq('id', communityId);
  if (error) throw new Error(error.message);
}

export async function setSignonMethod(
  communityId: string,
  method: SignonMethod
): Promise<void> {
  const { error } = await getClient()
    .from('vouch_communities')
    .update({ signon_method: method })
    .eq('id', communityId);
  if (error) throw new Error(error.message);
}

export async function isPhoneAllowed(
  communityId: string,
  phone: string
): Promise<boolean> {
  const digits = phoneDigits(phone);
  if (digits.length < 7) return false;
  const { data, error } = await getClient()
    .from('vouch_allowed_phones')
    .select('phone')
    .eq('community_id', communityId);
  if (error) throw new Error(error.message);
  return (data as { phone: string }[]).some((r) => phoneDigits(r.phone) === digits);
}

// Add phone numbers to the allowlist; returns how many were newly added.
export async function addAllowedPhones(
  communityId: string,
  phones: string[]
): Promise<number> {
  const rows = phones
    .map((p) => p.trim())
    .filter(Boolean)
    .map((phone) => ({ community_id: communityId, phone }));
  if (rows.length === 0) return 0;
  const { data, error } = await getClient()
    .from('vouch_allowed_phones')
    .upsert(rows, { onConflict: 'community_id,phone', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(error.message);
  return (data as unknown[]).length;
}

export async function listAllowedPhones(
  communityId: string
): Promise<{ id: string; phone: string }[]> {
  const { data, error } = await getClient()
    .from('vouch_allowed_phones')
    .select('id, phone')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as { id: string; phone: string }[];
}

export async function removeAllowedPhone(
  communityId: string,
  id: string
): Promise<void> {
  const { error } = await getClient()
    .from('vouch_allowed_phones')
    .delete()
    .eq('community_id', communityId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function countPendingMembers(communityId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('vouch_members')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listPendingMembers(
  communityId: string
): Promise<PendingMember[]> {
  const { data, error } = await getClient()
    .from('vouch_members')
    .select('id, name, phone, email, created_at')
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as PendingMember[];
}

export async function setMemberStatus(
  communityId: string,
  memberId: string,
  status: MemberStatus
): Promise<void> {
  const { error } = await getClient()
    .from('vouch_members')
    .update({ status })
    .eq('community_id', communityId)
    .eq('id', memberId);
  if (error) throw new Error(error.message);
}

export async function declineMember(
  communityId: string,
  memberId: string
): Promise<void> {
  // Declining removes the pending record entirely so they can re-request later.
  const { error } = await getClient()
    .from('vouch_members')
    .delete()
    .eq('community_id', communityId)
    .eq('id', memberId)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
}

export async function listAdmins(communityId: string): Promise<Member[]> {
  const { data, error } = await getClient()
    .from('vouch_members')
    .select()
    .eq('community_id', communityId)
    .eq('role', 'admin')
    .eq('status', 'approved');
  if (error) throw new Error(error.message);
  return (data ?? []) as Member[];
}

export async function getMemberByToken(
  communityId: string,
  token: string
): Promise<Member | undefined> {
  if (!token) return undefined;
  const { data, error } = await getClient()
    .from('vouch_members')
    .select()
    .eq('community_id', communityId)
    .eq('token', token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Member | null) ?? undefined;
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  if (!id) return undefined;
  const { data, error } = await getClient()
    .from('vouch_members')
    .select()
    .eq('id', id)
    .maybeSingle();
  if (error) return undefined; // invalid uuid reads as "not found"
  return (data as Member | null) ?? undefined;
}

export async function findMemberByPhone(
  communityId: string,
  phone: string
): Promise<Member | undefined> {
  const digits = phoneDigits(phone);
  if (digits.length < 7) return undefined;
  const { data, error } = await getClient()
    .from('vouch_members')
    .select()
    .eq('community_id', communityId)
    .not('phone', 'is', null);
  if (error) throw new Error(error.message);
  return (data as Member[]).find((m) => phoneDigits(m.phone) === digits);
}

export async function findMemberByEmail(
  communityId: string,
  email: string
): Promise<Member | undefined> {
  const needle = normalizeEmail(email);
  if (!needle.includes('@')) return undefined;
  const { data, error } = await getClient()
    .from('vouch_members')
    .select()
    .eq('community_id', communityId)
    .not('email', 'is', null);
  if (error) throw new Error(error.message);
  return (data as Member[]).find((m) => normalizeEmail(m.email) === needle);
}

// Name-claim onboarding: surface existing members who might be the person
// joining. Exact full-name matches rank ahead of first-name matches. Never
// exposes tokens or phone values — only enough to recognize oneself.
export async function findMembersByName(
  communityId: string,
  name: string
): Promise<MemberSuggestion[]> {
  const needle = name.trim().toLowerCase();
  if (!needle) return [];
  const first = needle.split(/\s+/)[0];

  const { data, error } = await getClient()
    .from('vouch_members')
    .select('id, name, phone, email, vouch_vouches(member_id)')
    .eq('community_id', communityId);
  if (error) throw new Error(error.message);

  type Row = { id: string; name: string; phone: string | null; email: string | null; vouch_vouches: unknown[] };
  const scored = (data as Row[])
    .map((m) => {
      const full = m.name.trim().toLowerCase();
      const memberFirst = full.split(/\s+/)[0];
      let rank = -1;
      if (full === needle) rank = 0;
      else if (memberFirst === first) rank = 1;
      return { m, rank };
    })
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.m.name.localeCompare(b.m.name))
    .slice(0, 3);

  return scored.map(({ m }) => ({
    id: m.id,
    name: m.name,
    vouchCount: m.vouch_vouches.length,
    hasPhone: !!m.phone,
    hasEmail: !!m.email,
  }));
}

// First-come, one-shot: only sets the phone while it's still null, so the
// first person to claim a seeded member owns it. Returns whether it applied.
export async function setMemberPhone(
  memberId: string,
  phone: string
): Promise<boolean> {
  const { data, error } = await getClient()
    .from('vouch_members')
    .update({ phone: phone.trim() })
    .eq('id', memberId)
    .is('phone', null)
    .select('id');
  if (error) throw new Error(error.message);
  return (data as unknown[]).length > 0;
}

// Email analogue of setMemberPhone: first-come, one-shot claim of a seeded
// member by email under email sign-on. Returns whether it applied.
export async function setMemberEmail(
  memberId: string,
  email: string
): Promise<boolean> {
  const { data, error } = await getClient()
    .from('vouch_members')
    .update({ email: email.trim() })
    .eq('id', memberId)
    .is('email', null)
    .select('id');
  if (error) throw new Error(error.message);
  return (data as unknown[]).length > 0;
}

export async function countActiveLoginTokens(memberId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('vouch_login_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createLoginToken(
  memberId: string,
  ttlMinutes: number
): Promise<string> {
  const expires = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const { data, error } = await getClient()
    .from('vouch_login_tokens')
    .insert({ member_id: memberId, token: randomUUID(), expires_at: expires })
    .select('token')
    .single();
  if (error) throw new Error(error.message);
  return (data as { token: string }).token;
}

// Single-use redemption: marks the token used and returns the member plus the
// community code/name so the claim page can sign in and redirect.
export async function redeemLoginToken(token: string): Promise<
  | { member: Member; community: { code: string; name: string; signon_method: SignonMethod } }
  | undefined
> {
  if (!token) return undefined;
  const db = getClient();
  const { data, error } = await db
    .from('vouch_login_tokens')
    .select('id, member_id, used_at, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (error) return undefined;
  const row = data as
    | { id: string; member_id: string; used_at: string | null; expires_at: string }
    | null;
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return undefined;

  // Mark used; guard against a concurrent redemption by filtering on used_at null.
  const { data: claimed, error: useErr } = await db
    .from('vouch_login_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id');
  if (useErr) throw new Error(useErr.message);
  if ((claimed as unknown[]).length === 0) return undefined; // lost the race

  const member = await getMemberById(row.member_id);
  if (!member) return undefined;
  const { data: comm, error: cErr } = await db
    .from('vouch_communities')
    .select('code, name, signon_method')
    .eq('id', member.community_id)
    .single();
  if (cErr) throw new Error(cErr.message);
  return {
    member,
    community: comm as { code: string; name: string; signon_method: SignonMethod },
  };
}

export async function getCommunityStats(communityId: string): Promise<{
  memberCount: number;
  vendorCount: number;
}> {
  const db = getClient();
  const [members, vendors] = await Promise.all([
    db
      .from('vouch_members')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId),
    db
      .from('vouch_vendors')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId),
  ]);
  if (members.error) throw new Error(members.error.message);
  if (vendors.error) throw new Error(vendors.error.message);
  return { memberCount: members.count ?? 0, vendorCount: vendors.count ?? 0 };
}

interface VendorRow extends Vendor {
  vouch_vouches: {
    tags: string[] | null;
    comment: string | null;
    created_at: string;
    vouch_members: { name: string } | null;
  }[];
}

// Shared select shape + stat mapping so vendor lists and request responses
// compute counts, top tags, latest comment, and voucher names identically.
const VENDOR_WITH_VOUCHES_SELECT =
  '*, vouch_vouches(tags, comment, created_at, vouch_members(name))';

function toVendorWithStats({ vouch_vouches, ...vendor }: VendorRow): VendorWithStats {
  const byRecent = [...vouch_vouches].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  const latest = byRecent.find((w) => w.comment);
  const names: string[] = [];
  // Aggregate tag usage across every vouch; insertion order keeps ties stable.
  const tagCounts = new Map<string, number>();
  for (const w of byRecent) {
    const name = w.vouch_members?.name;
    if (name && !names.includes(name)) names.push(name);
    for (const id of w.tags ?? []) {
      tagCounts.set(id, (tagCounts.get(id) ?? 0) + 1);
    }
  }
  const top_tags = Array.from(tagCounts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
  return {
    ...vendor,
    vouch_count: vouch_vouches.length,
    top_tags,
    latest_comment: latest?.comment ?? null,
    voucher_names: names,
  };
}

function sortByTrust(a: VendorWithStats, b: VendorWithStats): number {
  return (
    b.vouch_count - a.vouch_count ||
    b.created_at.localeCompare(a.created_at)
  );
}

export async function listVendors(
  communityId: string,
  opts: { category?: string; q?: string } = {}
): Promise<VendorWithStats[]> {
  let query = getClient()
    .from('vouch_vendors')
    .select(VENDOR_WITH_VOUCHES_SELECT)
    .eq('community_id', communityId);
  if (opts.category) query = query.eq('category', opts.category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const needle = opts.q?.toLowerCase();
  const needleDigits = (opts.q ?? '').replace(/\D/g, '');
  const vendors = (data as VendorRow[])
    .filter(
      (v) =>
        !needle ||
        v.name.toLowerCase().includes(needle) ||
        getCategory(v.category).label.toLowerCase().includes(needle) ||
        (needleDigits.length >= 3 &&
          phoneDigits(v.phone).includes(needleDigits)) ||
        v.vouch_vouches.some((w) => w.comment?.toLowerCase().includes(needle))
    )
    .map(toVendorWithStats);

  return vendors.sort(sortByTrust);
}

export async function getVendor(id: string): Promise<Vendor | undefined> {
  if (!id) return undefined;
  const { data, error } = await getClient()
    .from('vouch_vendors')
    .select()
    .eq('id', id)
    .maybeSingle();
  // An invalid uuid in the URL should read as "not found", not a server error.
  if (error) return undefined;
  return (data as Vendor | null) ?? undefined;
}

export async function findVendorByPhone(
  communityId: string,
  phone: string
): Promise<Vendor | undefined> {
  const digits = phoneDigits(phone);
  if (digits.length < 7) return undefined; // too short to be a reliable match
  const { data, error } = await getClient()
    .from('vouch_vendors')
    .select()
    .eq('community_id', communityId)
    .not('phone', 'is', null);
  if (error) throw new Error(error.message);
  return (data as Vendor[]).find((v) => phoneDigits(v.phone) === digits);
}

export async function createVendor(input: {
  communityId: string;
  name: string;
  category: string;
  phone: string | null;
  contact: string | null;
  addedBy: string;
}): Promise<Vendor> {
  const { data, error } = await getClient()
    .from('vouch_vendors')
    .insert({
      community_id: input.communityId,
      name: input.name,
      category: input.category,
      phone: input.phone,
      contact: input.contact,
      added_by: input.addedBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Vendor;
}

// Whitelist editable fields so a `changes` patch can never touch ids/ownership.
function sanitizeVendorChanges(changes: VendorEditChanges): VendorEditChanges {
  const out: VendorEditChanges = {};
  if (typeof changes.name === 'string' && changes.name.trim())
    out.name = changes.name.trim().slice(0, 80);
  if (typeof changes.category === 'string' && isValidCategory(changes.category))
    out.category = changes.category;
  if ('phone' in changes)
    out.phone = (changes.phone ?? '').toString().trim().slice(0, 30) || null;
  if ('contact' in changes)
    out.contact = (changes.contact ?? '').toString().trim().slice(0, 120) || null;
  return out;
}

export async function updateVendorFields(
  vendorId: string,
  changes: VendorEditChanges
): Promise<void> {
  const patch = sanitizeVendorChanges(changes);
  if (Object.keys(patch).length === 0) return;
  const { error } = await getClient()
    .from('vouch_vendors')
    .update(patch)
    .eq('id', vendorId);
  if (error) throw new Error(error.message);
}

export async function proposeVendorEdit(input: {
  communityId: string;
  vendorId: string;
  proposedBy: string;
  changes: VendorEditChanges;
}): Promise<void> {
  const patch = sanitizeVendorChanges(input.changes);
  if (Object.keys(patch).length === 0) throw new Error('No changes to propose.');
  const { error } = await getClient().from('vouch_vendor_edits').insert({
    community_id: input.communityId,
    vendor_id: input.vendorId,
    proposed_by: input.proposedBy,
    changes: patch,
  });
  if (error) throw new Error(error.message);
}

export async function countPendingEdits(communityId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('vouch_vendor_edits')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listPendingEdits(
  communityId: string
): Promise<PendingVendorEdit[]> {
  const { data, error } = await getClient()
    .from('vouch_vendor_edits')
    .select(
      'id, vendor_id, changes, created_at, vouch_members!vouch_vendor_edits_proposed_by_fkey(name), vouch_vendors(name, category, phone, contact)'
    )
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  type Row = {
    id: string;
    vendor_id: string;
    changes: VendorEditChanges;
    created_at: string;
    vouch_members: { name: string } | null;
    vouch_vendors: { name: string; category: string; phone: string | null; contact: string | null } | null;
  };
  return (data as unknown as Row[])
    .filter((r) => r.vouch_vendors) // skip orphans (vendor deleted)
    .map((r) => ({
      id: r.id,
      vendor_id: r.vendor_id,
      proposed_by_name: r.vouch_members?.name ?? 'Someone',
      created_at: r.created_at,
      changes: r.changes,
      current: r.vouch_vendors!,
    }));
}

// Approve (apply the patch to the vendor) or reject a pending edit. Returns the
// affected vendor id so the caller can refresh. Guards on status='pending' so a
// double review can't double-apply.
export async function reviewVendorEdit(
  editId: string,
  communityId: string,
  reviewerId: string,
  action: 'approve' | 'reject'
): Promise<boolean> {
  const db = getClient();
  const { data, error } = await db
    .from('vouch_vendor_edits')
    .select('id, vendor_id, changes, status')
    .eq('id', editId)
    .eq('community_id', communityId)
    .maybeSingle();
  if (error) return false;
  const row = data as
    | { id: string; vendor_id: string; changes: VendorEditChanges; status: string }
    | null;
  if (!row || row.status !== 'pending') return false;

  const { data: claimed, error: cErr } = await db
    .from('vouch_vendor_edits')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('status', 'pending')
    .select('id');
  if (cErr) throw new Error(cErr.message);
  if ((claimed as unknown[]).length === 0) return false; // lost the race

  if (action === 'approve') await updateVendorFields(row.vendor_id, row.changes);
  return true;
}

export async function listVouches(vendorId: string): Promise<VouchWithMember[]> {
  const { data, error } = await getClient()
    .from('vouch_vouches')
    .select('*, vouch_members(name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as (VouchWithMember & { vouch_members: { name: string } })[]).map(
    ({ vouch_members, ...vouch }) => ({ ...vouch, member_name: vouch_members.name })
  );
}

export async function upsertVouch(input: {
  vendorId: string;
  memberId: string;
  tags: string[];
  comment: string | null;
}): Promise<void> {
  const { error } = await getClient()
    .from('vouch_vouches')
    .upsert(
      {
        vendor_id: input.vendorId,
        member_id: input.memberId,
        tags: input.tags,
        comment: input.comment,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'vendor_id,member_id' }
    );
  if (error) throw new Error(error.message);
}

// ── "Ask the group" requests ──────────────────────────────────────────────

export async function createRequest(input: {
  communityId: string;
  category: string;
  note: string | null;
  askedBy: string;
}): Promise<VouchRequest> {
  const { data, error } = await getClient()
    .from('vouch_requests')
    .insert({
      community_id: input.communityId,
      category: input.category,
      note: input.note,
      asked_by: input.askedBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VouchRequest;
}

export async function countOpenRequests(communityId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('vouch_requests')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'open');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

interface RequestRow {
  id: string;
  category: string;
  note: string | null;
  asked_by: string;
  status: RequestStatus;
  created_at: string;
  vouch_members: { name: string } | null;
  vouch_request_vendors: { vendor_id: string }[];
}

const REQUEST_SELECT =
  'id, category, note, asked_by, status, created_at, vouch_members!vouch_requests_asked_by_fkey(name), vouch_request_vendors(vendor_id)';

function toRequestSummary(r: RequestRow): RequestSummary {
  return {
    id: r.id,
    category: r.category,
    note: r.note,
    asked_by: r.asked_by,
    asked_by_name: r.vouch_members?.name ?? 'Someone',
    status: r.status,
    created_at: r.created_at,
    response_count: r.vouch_request_vendors.length,
  };
}

export async function listOpenRequests(
  communityId: string
): Promise<RequestSummary[]> {
  const { data, error } = await getClient()
    .from('vouch_requests')
    .select(REQUEST_SELECT)
    .eq('community_id', communityId)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as RequestRow[]).map(toRequestSummary);
}

export async function getRequestDetail(
  requestId: string,
  communityId: string
): Promise<RequestDetail | undefined> {
  if (!requestId) return undefined;
  const db = getClient();
  const { data, error } = await db
    .from('vouch_requests')
    .select(REQUEST_SELECT)
    .eq('id', requestId)
    .eq('community_id', communityId)
    .maybeSingle();
  if (error) return undefined;
  const row = data as unknown as RequestRow | null;
  if (!row) return undefined;

  const vendorIds = row.vouch_request_vendors.map((rv) => rv.vendor_id);
  let responses: VendorWithStats[] = [];
  if (vendorIds.length > 0) {
    const { data: vData, error: vErr } = await db
      .from('vouch_vendors')
      .select(VENDOR_WITH_VOUCHES_SELECT)
      .in('id', vendorIds);
    if (vErr) throw new Error(vErr.message);
    responses = (vData as VendorRow[]).map(toVendorWithStats).sort(sortByTrust);
  }

  return { ...toRequestSummary(row), responses };
}

// Link a vendor to a request as a response. Idempotent on (request, vendor).
export async function linkVendorToRequest(input: {
  requestId: string;
  vendorId: string;
  memberId: string;
}): Promise<void> {
  const { error } = await getClient()
    .from('vouch_request_vendors')
    .upsert(
      {
        request_id: input.requestId,
        vendor_id: input.vendorId,
        member_id: input.memberId,
      },
      { onConflict: 'request_id,vendor_id' }
    );
  if (error) throw new Error(error.message);
}

export async function getRequest(
  requestId: string
): Promise<VouchRequest | undefined> {
  if (!requestId) return undefined;
  const { data, error } = await getClient()
    .from('vouch_requests')
    .select()
    .eq('id', requestId)
    .maybeSingle();
  if (error) return undefined;
  return (data as VouchRequest | null) ?? undefined;
}

export async function closeRequest(
  requestId: string,
  communityId: string
): Promise<void> {
  const { error } = await getClient()
    .from('vouch_requests')
    .update({ status: 'closed' })
    .eq('id', requestId)
    .eq('community_id', communityId);
  if (error) throw new Error(error.message);
}
