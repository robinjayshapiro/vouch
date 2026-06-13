import { NextResponse } from 'next/server';
import { findMembersByName, getCommunityByCode } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Powers name-claim onboarding: given a typed name, return existing members
// who might be the same person. Only display-safe fields are returned.
export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const suggestions = await findMembersByName(community.id, name);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('POST /api/communities/[code]/members/match error:', err);
    return NextResponse.json({ error: 'Could not check the directory. Please try again.' }, { status: 500 });
  }
}
