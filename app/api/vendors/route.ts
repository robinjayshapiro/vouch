import { NextResponse } from 'next/server';
import {
  createVendor,
  getCommunityByCode,
  getMemberByToken,
  listVendors,
  upsertVouch,
} from '@/lib/db';
import { isValidCategory } from '@/lib/categories';

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
    rating?: number;
    comment?: string;
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
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Please pick a star rating from 1 to 5.' },
      { status: 400 }
    );
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

    const phone = (body.phone ?? '').trim().slice(0, 30) || null;
    const contact = (body.contact ?? '').trim().slice(0, 120) || null;
    const comment = (body.comment ?? '').trim().slice(0, 1000) || null;

    const vendor = await createVendor({
      communityId: community.id,
      name,
      category: body.category,
      phone,
      contact,
      addedBy: member.id,
    });
    await upsertVouch({ vendorId: vendor.id, memberId: member.id, rating, comment });

    return NextResponse.json({ vendor });
  } catch (err) {
    console.error('POST /api/vendors error:', err);
    return NextResponse.json({ error: 'Could not save vendor. Please try again.' }, { status: 500 });
  }
}
