import { NextResponse } from 'next/server';
import { redeemLoginToken } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Redeem a magic link. Single-use: returns the member identity (incl. token
// for localStorage) plus community code/name for redirect. needsPhone tells the
// claim page whether to offer phone capture (true for members claimed by name).
export async function POST(request: Request) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const result = await redeemLoginToken(body.token ?? '');
    if (!result) {
      return NextResponse.json(
        { error: 'This sign-in link has expired or was already used. Request a new one.' },
        { status: 410 }
      );
    }
    const { member, community } = result;
    return NextResponse.json({
      member: { id: member.id, name: member.name, token: member.token },
      community: { code: community.code, name: community.name },
      needsPhone: !member.phone,
    });
  } catch (err) {
    console.error('POST /api/auth/claim error:', err);
    return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 500 });
  }
}
