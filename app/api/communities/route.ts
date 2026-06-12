import { NextResponse } from 'next/server';
import { createCommunity } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { communityName?: string; yourName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const communityName = (body.communityName ?? '').trim();
  const yourName = (body.yourName ?? '').trim();

  if (!communityName || communityName.length > 60) {
    return NextResponse.json(
      { error: 'Please give your community a name (up to 60 characters).' },
      { status: 400 }
    );
  }
  if (!yourName || yourName.length > 40) {
    return NextResponse.json(
      { error: 'Please tell us your name (up to 40 characters).' },
      { status: 400 }
    );
  }

  const { community, member } = createCommunity(communityName, yourName);
  return NextResponse.json({
    community: { id: community.id, name: community.name, code: community.code },
    member: { id: member.id, name: member.name, token: member.token },
  });
}
