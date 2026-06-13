import { NextResponse } from 'next/server';
import {
  getCommunityByCode,
  getMemberByToken,
  getRequest,
  getVendor,
  linkVendorToRequest,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

// Respond to a request by pointing at an EXISTING vendor ("I vouch for this
// one"). New-vendor responses link via the requestId field on POST /api/vendors.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: { code?: string; token?: string; vendorId?: string };
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
    const req = await getRequest(params.id);
    if (!req || req.community_id !== community.id) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }
    const vendor = await getVendor(body.vendorId ?? '');
    if (!vendor || vendor.community_id !== community.id) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
    }
    await linkVendorToRequest({ requestId: req.id, vendorId: vendor.id, memberId: member.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/requests/[id]/respond error:', err);
    return NextResponse.json({ error: 'Could not add your recommendation. Please try again.' }, { status: 500 });
  }
}
