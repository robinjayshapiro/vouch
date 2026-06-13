import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type {
  Community,
  Member,
  MemberSuggestion,
  Vendor,
  VendorWithStats,
  VouchWithMember,
} from '@/types';
import { getCategory } from '@/lib/categories';

// Phones are the natural dedup key ("here's his number") — compare on the
// last 10 digits so formatting and country-code prefixes don't matter.
export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-10);
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
  phone?: string | null
): Promise<Member> {
  const { data, error } = await getClient()
    .from('vouch_members')
    .insert({
      community_id: communityId,
      name,
      token: randomUUID(),
      phone: phone?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Member;
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
    .select('id, name, phone, vouch_vouches(member_id)')
    .eq('community_id', communityId);
  if (error) throw new Error(error.message);

  type Row = { id: string; name: string; phone: string | null; vouch_vouches: unknown[] };
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
  | { member: Member; community: { code: string; name: string } }
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
    .select('code, name')
    .eq('id', member.community_id)
    .single();
  if (cErr) throw new Error(cErr.message);
  return { member, community: comm as { code: string; name: string } };
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
  vouch_vouches: { rating: number; comment: string | null; created_at: string }[];
}

export async function listVendors(
  communityId: string,
  opts: { category?: string; q?: string } = {}
): Promise<VendorWithStats[]> {
  let query = getClient()
    .from('vouch_vendors')
    .select('*, vouch_vouches(rating, comment, created_at)')
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
    .map(({ vouch_vouches, ...vendor }): VendorWithStats => {
      const latest = [...vouch_vouches]
        .filter((w) => w.comment)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      return {
        ...vendor,
        vouch_count: vouch_vouches.length,
        avg_rating:
          vouch_vouches.length > 0
            ? vouch_vouches.reduce((sum, w) => sum + w.rating, 0) / vouch_vouches.length
            : null,
        latest_comment: latest?.comment ?? null,
      };
    });

  return vendors.sort(
    (a, b) =>
      b.vouch_count - a.vouch_count ||
      (b.avg_rating ?? 0) - (a.avg_rating ?? 0) ||
      b.created_at.localeCompare(a.created_at)
  );
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
  rating: number;
  comment: string | null;
}): Promise<void> {
  const { error } = await getClient()
    .from('vouch_vouches')
    .upsert(
      {
        vendor_id: input.vendorId,
        member_id: input.memberId,
        rating: input.rating,
        comment: input.comment,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'vendor_id,member_id' }
    );
  if (error) throw new Error(error.message);
}
