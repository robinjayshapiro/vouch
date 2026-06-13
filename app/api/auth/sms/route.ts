import { NextResponse } from 'next/server';
import {
  countActiveLoginTokens,
  createLoginToken,
  findMemberByPhone,
  getCommunityByCode,
  getMemberById,
} from '@/lib/db';
import { appUrl, sendSms, signInMessage } from '@/lib/sms';

export const dynamic = 'force-dynamic';

// Request a sign-in link by SMS. Caller identifies the member either by phone
// (returning member on a new device) or by memberId (chose a suggestion that
// already has a phone on file). We always respond {ok:true} so the endpoint
// can't be used to probe which numbers/members exist.
export async function POST(request: Request) {
  let body: { code?: string; phone?: string; memberId?: string };
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
      : body.phone
      ? await findMemberByPhone(community.id, body.phone)
      : undefined;

    // Only text members who belong to this community and have a phone on file.
    if (member && member.community_id === community.id && member.phone) {
      // Light rate limit: don't pile up live links for one member.
      if ((await countActiveLoginTokens(member.id)) < 3) {
        const token = await createLoginToken(member.id, 15);
        const link = `${appUrl()}/claim/${token}`;
        await sendSms(member.phone, signInMessage(community.name, link));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/sms error:', err);
    return NextResponse.json({ error: 'Could not send the link. Please try again.' }, { status: 500 });
  }
}
