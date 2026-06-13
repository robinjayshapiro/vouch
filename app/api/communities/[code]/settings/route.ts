import { NextResponse } from 'next/server';
import {
  getCommunityByCode,
  getMemberByToken,
  listAllowedPhones,
  listPendingMembers,
  setJoinPolicy,
} from '@/lib/db';
import type { JoinPolicy } from '@/types';

export const dynamic = 'force-dynamic';

const POLICIES: JoinPolicy[] = ['open', 'admin_approval', 'approved_list'];

async function requireAdmin(code: string, token: string) {
  const community = await getCommunityByCode(code);
  if (!community) return { error: 'Community not found.', status: 404 as const };
  const member = await getMemberByToken(community.id, token);
  if (!member || member.role !== 'admin')
    return { error: 'Admins only.', status: 403 as const };
  return { community, member };
}

// Admin: current join policy + allowlist + pending members for the settings UI.
export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try {
    const r = await requireAdmin(params.code, token);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    const [allowedPhones, pendingMembers] = await Promise.all([
      listAllowedPhones(r.community.id),
      listPendingMembers(r.community.id),
    ]);
    return NextResponse.json({
      joinPolicy: r.community.join_policy,
      allowedPhones,
      pendingMembers,
    });
  } catch (err) {
    console.error('GET /api/communities/[code]/settings error:', err);
    return NextResponse.json({ error: 'Could not load settings.' }, { status: 500 });
  }
}

// Admin: change the join policy.
export async function PUT(
  request: Request,
  { params }: { params: { code: string } }
) {
  let body: { token?: string; joinPolicy?: JoinPolicy };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!body.joinPolicy || !POLICIES.includes(body.joinPolicy)) {
    return NextResponse.json({ error: 'Invalid join policy.' }, { status: 400 });
  }
  try {
    const r = await requireAdmin(params.code, body.token ?? '');
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    await setJoinPolicy(r.community.id, body.joinPolicy);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/communities/[code]/settings error:', err);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }
}
