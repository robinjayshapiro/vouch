import { NextResponse } from 'next/server';
import {
  countOpenRequests,
  countPendingEdits,
  countPendingMembers,
  getCommunityByCode,
  getCommunityStats,
  getMemberByToken,
} from '@/lib/db';
import type { MemberRole, MemberStatus } from '@/types';

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
    const openRequests = await countOpenRequests(community.id);

    // If a valid token is supplied, tell the client the viewer's role/status
    // (so it can show moderation UI or a pending-approval screen).
    let viewerRole: MemberRole | null = null;
    let viewerStatus: MemberStatus | null = null;
    let pendingEdits = 0;
    let pendingMembers = 0;
    if (token) {
      const member = await getMemberByToken(community.id, token);
      if (member) {
        viewerRole = member.role;
        viewerStatus = member.status;
        if (member.role === 'admin') {
          pendingEdits = await countPendingEdits(community.id);
          pendingMembers = await countPendingMembers(community.id);
        }
      }
    }

    return NextResponse.json({
      community: {
        id: community.id,
        name: community.name,
        code: community.code,
        join_policy: community.join_policy,
      },
      ...stats,
      openRequests,
      viewerRole,
      viewerStatus,
      pendingEdits,
      pendingMembers,
    });
  } catch (err) {
    console.error('GET /api/communities/[code] error:', err);
    return NextResponse.json({ error: 'Could not load community. Please try again.' }, { status: 500 });
  }
}
