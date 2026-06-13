import { NextResponse } from 'next/server';
import {
  createRequest,
  getCommunityByCode,
  getMemberByToken,
  listOpenRequests,
} from '@/lib/db';
import { isValidCategory } from '@/lib/categories';

export const dynamic = 'force-dynamic';

// List open requests for the community (cold-start pull on the directory).
export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const requests = await listOpenRequests(community.id);
    return NextResponse.json({ requests });
  } catch (err) {
    console.error('GET /api/communities/[code]/requests error:', err);
    return NextResponse.json({ error: 'Could not load requests.' }, { status: 500 });
  }
}

// Post a new "anyone know a …?" request.
export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  let body: { token?: string; category?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!body.category || !isValidCategory(body.category)) {
    return NextResponse.json({ error: 'Please pick what kind of help you need.' }, { status: 400 });
  }

  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const member = await getMemberByToken(community.id, body.token ?? '');
    if (!member) {
      return NextResponse.json(
        { error: 'We could not verify you. Try rejoining the community.' },
        { status: 401 }
      );
    }
    if (member.status !== 'approved') {
      return NextResponse.json(
        { error: 'Your membership is awaiting approval.' },
        { status: 403 }
      );
    }
    const note = (body.note ?? '').trim().slice(0, 280) || null;
    const req = await createRequest({
      communityId: community.id,
      category: body.category,
      note,
      askedBy: member.id,
    });
    return NextResponse.json({ request: { id: req.id } });
  } catch (err) {
    console.error('POST /api/communities/[code]/requests error:', err);
    return NextResponse.json({ error: 'Could not post your request. Please try again.' }, { status: 500 });
  }
}
