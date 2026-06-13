import { NextResponse } from 'next/server';
import { closeRequest, getCommunityByCode, getMemberByToken, getRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Close a request. Allowed for the asker or any admin.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: { code?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const community = await getCommunityByCode(body.code ?? '');
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const member = await getMemberByToken(community.id, body.token ?? '');
    if (!member) {
      return NextResponse.json(
        { error: 'We could not verify you.' },
        { status: 401 }
      );
    }
    const req = await getRequest(params.id);
    if (!req || req.community_id !== community.id) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }
    if (req.asked_by !== member.id && member.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only the person who asked (or an organizer) can close this.' },
        { status: 403 }
      );
    }
    await closeRequest(req.id, community.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/requests/[id]/close error:', err);
    return NextResponse.json({ error: 'Could not close the request. Please try again.' }, { status: 500 });
  }
}
