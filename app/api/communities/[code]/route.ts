import { NextResponse } from 'next/server';
import { getCommunityByCode, getCommunityStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json(
        { error: 'We could not find a community with that code. Double-check it and try again.' },
        { status: 404 }
      );
    }
    const stats = await getCommunityStats(community.id);
    return NextResponse.json({
      community: { id: community.id, name: community.name, code: community.code },
      ...stats,
    });
  } catch (err) {
    console.error('GET /api/communities/[code] error:', err);
    return NextResponse.json({ error: 'Could not load community. Please try again.' }, { status: 500 });
  }
}
