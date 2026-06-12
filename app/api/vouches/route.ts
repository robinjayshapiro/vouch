import { NextResponse } from 'next/server';
import { getCommunityByCode, getMemberByToken, getVendor, upsertVouch } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: {
    code?: string;
    token?: string;
    vendorId?: string;
    rating?: number;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const community = getCommunityByCode(body.code ?? '');
  if (!community) {
    return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  }
  const member = getMemberByToken(community.id, body.token ?? '');
  if (!member) {
    return NextResponse.json(
      { error: 'We could not verify you. Try rejoining the community.' },
      { status: 401 }
    );
  }
  const vendor = getVendor(body.vendorId ?? '');
  if (!vendor || vendor.community_id !== community.id) {
    return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
  }
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Please pick a star rating from 1 to 5.' },
      { status: 400 }
    );
  }
  const comment = (body.comment ?? '').trim().slice(0, 1000) || null;

  upsertVouch({ vendorId: vendor.id, memberId: member.id, rating, comment });
  return NextResponse.json({ ok: true });
}
