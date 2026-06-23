import { NextResponse } from 'next/server';
import {
  declineMember,
  getCommunityByCode,
  getMemberById,
  getMemberByToken,
  setMemberStatus,
} from '@/lib/db';
import { notifyMemberApproved } from '@/lib/notify';

export const dynamic = 'force-dynamic';

// Admin: approve or decline a pending member.
export async function POST(
  request: Request,
  { params }: { params: { code: string; id: string } }
) {
  let body: { token?: string; action?: 'approve' | 'decline' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (body.action !== 'approve' && body.action !== 'decline') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }
  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const admin = await getMemberByToken(community.id, body.token ?? '');
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    }
    if (body.action === 'approve') {
      await setMemberStatus(community.id, params.id, 'approved');
      // Notify the member they're in — the sign-in link doubles as their welcome.
      const approved = await getMemberById(params.id);
      if (approved) notifyMemberApproved(approved, community);
    } else {
      await declineMember(community.id, params.id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/communities/[code]/members/[id] error:', err);
    return NextResponse.json({ error: 'Could not update the member.' }, { status: 500 });
  }
}
