import { NextResponse } from 'next/server';
import { getCommunityByCode, getMemberByToken, reviewVendorEdit } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Admin-only: approve (apply) or reject a pending vendor edit.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: { code?: string; token?: string; action?: 'approve' | 'reject' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }

  try {
    const community = await getCommunityByCode(body.code ?? '');
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const member = await getMemberByToken(community.id, body.token ?? '');
    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    }
    const ok = await reviewVendorEdit(params.id, community.id, member.id, body.action);
    if (!ok) {
      return NextResponse.json(
        { error: 'That edit was already reviewed.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/moderation/[id] error:', err);
    return NextResponse.json({ error: 'Could not review the edit. Please try again.' }, { status: 500 });
  }
}
