import { NextResponse } from 'next/server';
import {
  createLoginToken,
  getCommunityByCode,
  getMemberById,
  setMemberPhone,
} from '@/lib/db';
import { appUrl, sendSms, signInMessage } from '@/lib/sms';

export const dynamic = 'force-dynamic';

// Seeded-member onboarding: someone recognizes themselves in a suggestion that
// has no phone yet, and supplies their mobile. We attach the phone (first-come,
// one-shot) and text a sign-in link to it. Honor-system by design — fine for a
// trust circle, and every later sign-in is then SMS-verified. Always {ok:true}.
export async function POST(request: Request) {
  let body: { code?: string; memberId?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const phone = (body.phone ?? '').trim();
  if (!phone) {
    return NextResponse.json({ error: 'Please enter your mobile number.' }, { status: 400 });
  }

  try {
    const community = await getCommunityByCode(body.code ?? '');
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const member = body.memberId ? await getMemberById(body.memberId) : undefined;
    if (member && member.community_id === community.id) {
      const applied = await setMemberPhone(member.id, phone);
      if (applied) {
        const token = await createLoginToken(member.id, 15);
        const link = `${appUrl()}/claim/${token}`;
        await sendSms(phone, signInMessage(community.name, link));
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/claim-by-name error:', err);
    return NextResponse.json({ error: 'Could not start the claim. Please try again.' }, { status: 500 });
  }
}
