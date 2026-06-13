import { NextResponse } from 'next/server';
import {
  countPendingEdits,
  getCommunityByCode,
  getCommunityStats,
  getMemberByToken,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json(
        { error: 'We could not find a community with that code. Double-check it and try again.' },
        { status: 404 }
      );
    }
    const stats = await getCommunityStats(community.id);

    // If a valid token is supplied, tell the client whether the viewer is an
    // admin (and how many edits await review) so it can show moderation UI.
    let viewerRole: 'admin' | 'member' | null = null;
    let pendingEdits = 0;
    if (token) {
      const member = await getMemberByToken(community.id, token);
      if (member) {
        viewerRole = member.role;
        if (member.role === 'admin') pendingEdits = await countPendingEdits(community.id);
      }
    }

    return NextResponse.json({
      community: { id: community.id, name: community.name, code: community.code },
      ...stats,
      viewerRole,
      pendingEdits,
    });
  } catch (err) {
    console.error('GET /api/communities/[code] error:', err);
    return NextResponse.json({ error: 'Could not load community. Please try again.' }, { status: 500 });
  }
}
