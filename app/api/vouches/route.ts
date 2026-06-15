import { NextResponse } from 'next/server';
import { getCommunityByCode, getMemberByToken, getVendor, upsertVouch } from '@/lib/db';
import { sanitizeTags } from '@/lib/tags';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: {
    code?: string;
    token?: string;
    vendorId?: string;
    tags?: unknown;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Tags are optional context (the vouch itself is the endorsement).
  const tags = sanitizeTags(body.tags);

  try {
    const community = await getCommunityByCode(body.code ?? '');
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
    const vendor = await getVendor(body.vendorId ?? '');
    if (!vendor || vendor.community_id !== community.id) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
    }
    const comment = (body.comment ?? '').trim().slice(0, 1000) || null;

    await upsertVouch({ vendorId: vendor.id, memberId: member.id, tags, comment });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/vouches error:', err);
    return NextResponse.json({ error: 'Could not save vouch. Please try again.' }, { status: 500 });
  }
}
