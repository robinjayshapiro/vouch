import { NextResponse } from 'next/server';
import { getCommunityByCode, joinCommunity } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
  if (!name || name.length > 40) {
    return NextResponse.json(
      { error: 'Please tell us your name (up to 40 characters).' },
      { status: 400 }
    );
  }

  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json(
        { error: 'We could not find a community with that code. Double-check it and try again.' },
        { status: 404 }
      );
    }
    const member = await joinCommunity(community.id, name);
    return NextResponse.json({
      community: { id: community.id, name: community.name, code: community.code },
      member: { id: member.id, name: member.name, token: member.token },
    });
  } catch (err) {
    console.error('POST /api/communities/[code]/join error:', err);
    return NextResponse.json({ error: 'Could not join community. Please try again.' }, { status: 500 });
  }
}
