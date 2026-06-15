import { NextResponse } from 'next/server';
import {
  createVendor,
  findVendorByPhone,
  getCommunityByCode,
  getMemberByToken,
  getRequest,
  linkVendorToRequest,
  listVendors,
  upsertVouch,
} from '@/lib/db';
import { isValidCategory } from '@/lib/categories';
import { sanitizeTags } from '@/lib/tags';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') ?? '';
  try {
    const community = await getCommunityByCode(code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const category = url.searchParams.get('category') ?? undefined;
    const q = (url.searchParams.get('q') ?? '').trim() || undefined;
    const vendors = await listVendors(community.id, { category, q });
    return NextResponse.json({ vendors });
  } catch (err) {
    console.error('GET /api/vendors error:', err);
    return NextResponse.json({ error: 'Could not load vendors. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: {
    code?: string;
    token?: string;
    name?: string;
    category?: string;
    phone?: string;
    contact?: string;
    tags?: unknown;
    comment?: string;
    requestId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: 'Please enter the name of the person or business (up to 80 characters).' },
      { status: 400 }
    );
  }
  if (!body.category || !isValidCategory(body.category)) {
    return NextResponse.json({ error: 'Please pick a category.' }, { status: 400 });
  }
  // Tags are optional context on the first vouch.
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

    const phone = (body.phone ?? '').trim().slice(0, 30) || null;
    const contact = (body.contact ?? '').trim().slice(0, 120) || null;
    const comment = (body.comment ?? '').trim().slice(0, 1000) || null;

    if (phone) {
      const existing = await findVendorByPhone(community.id, phone);
      if (existing) {
        return NextResponse.json(
          {
            error: `${existing.name} is already in your directory with that phone number.`,
            existing: { id: existing.id, name: existing.name },
          },
          { status: 409 }
        );
      }
    }

    const vendor = await createVendor({
      communityId: community.id,
      name,
      category: body.category,
      phone,
      contact,
      addedBy: member.id,
    });
    await upsertVouch({ vendorId: vendor.id, memberId: member.id, tags, comment });

    // If this vendor was added in response to an "ask the group" request, link it.
    if (body.requestId) {
      const req = await getRequest(body.requestId);
      if (req && req.community_id === community.id) {
        await linkVendorToRequest({
          requestId: req.id,
          vendorId: vendor.id,
          memberId: member.id,
        });
      }
    }

    return NextResponse.json({ vendor });
  } catch (err) {
    console.error('POST /api/vendors error:', err);
    return NextResponse.json({ error: 'Could not save vendor. Please try again.' }, { status: 500 });
  }
}
