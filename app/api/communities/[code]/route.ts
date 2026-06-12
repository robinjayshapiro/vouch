import { NextResponse } from 'next/server';
import { getCommunityByCode, getCommunityStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const community = getCommunityByCode(params.code);
  if (!community) {
    return NextResponse.json(
      { error: 'We could not find a community with that code. Double-check it and try again.' },
      { status: 404 }
    );
  }
  const stats = getCommunityStats(community.id);
  return NextResponse.json({
    community: { id: community.id, name: community.name, code: community.code },
    ...stats,
  });
}
