import { NextResponse } from 'next/server';
import { getCommunityByCode, getRequestDetail } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Full detail for the ask page: the request + the vendors recommended for it.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const code = new URL(request.url).searchParams.get('code') ?? '';
  try {
    const community = await getCommunityByCode(code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const detail = await getRequestDetail(params.id, community.id);
    if (!detail) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }
    return NextResponse.json({ request: detail });
  } catch (err) {
    console.error('GET /api/requests/[id] error:', err);
    return NextResponse.json({ error: 'Could not load the request.' }, { status: 500 });
  }
}
