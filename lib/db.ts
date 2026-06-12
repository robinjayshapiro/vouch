import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type {
  Community,
  Member,
  Vendor,
  VendorWithStats,
  VouchWithMember,
} from '@/types';

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
  name: string
): Promise<Member> {
  const { data, error } = await getClient()
    .from('vouch_members')
    .insert({ community_id: communityId, name, token: randomUUID() })
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
  const vendors = (data as VendorRow[])
    .filter(
      (v) =>
        !needle ||
        v.name.toLowerCase().includes(needle) ||
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
