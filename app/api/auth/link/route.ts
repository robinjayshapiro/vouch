import { NextResponse } from 'next/server';
import {
  countActiveLoginTokens,
  findMemberByEmail,
  findMemberByPhone,
  getCommunityByCode,
  getMemberById,
} from '@/lib/db';
import { sendSignInLink } from '@/lib/signin';

export const dynamic = 'force-dynamic';

// Request a magic sign-in link. The caller identifies the member by memberId
// (chose a suggestion already on file), by phone, or by email — whichever the
// community's sign-on mechanism uses. The link is delivered over the matching
// channel (SMS or email). We always respond {ok:true} so the endpoint can't be
// used to probe which members exist.
export async function POST(request: Request) {
  let body: { code?: string; phone?: string; email?: string; memberId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const community = await getCommunityByCode(body.code ?? '');
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const member = body.memberId
      ? await getMemberById(body.memberId)
      : body.email
      ? await findMemberByEmail(community.id, body.email)
      : body.phone
      ? await findMemberByPhone(community.id, body.phone)
      : undefined;

    // Only message members who belong to this community. Light rate limit so we
    // don't pile up live links for one member. sendSignInLink picks the channel
    // (and no-ops for 'off' or a missing contact on the selected channel).
    let devLink: string | null = null;
    if (member && member.community_id === community.id) {
      if ((await countActiveLoginTokens(member.id)) < 3) {
        ({ devLink } = await sendSignInLink(member, community));
      }
    }

    // devLink is only populated in local dev (no provider), so this still can't
    // be used to probe which members exist in production.
    return NextResponse.json({ ok: true, ...(devLink && { devLink }) });
  } catch (err) {
    console.error('POST /api/auth/link error:', err);
    return NextResponse.json({ error: 'Could not send the link. Please try again.' }, { status: 500 });
  }
}
