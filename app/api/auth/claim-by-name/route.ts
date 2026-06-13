import { NextResponse } from 'next/server';
import { getCommunityByCode, getMemberById, setMemberPhone } from '@/lib/db';

export const dynamic = 'force-dynamic';

// First-time claim of a seeded member done manually at login: the person
// recognizes themselves in a suggestion that has no phone yet and supplies
// their mobile. We attach the phone (first-come, one-shot) and sign them in
// right here on this device — no delivered link required, so claiming works
// with no SMS/email provider configured. Honor-system by design, which is
// fine for a trust circle; the captured phone is what verifies later sign-ins
// from other devices. If the member already has a phone, someone has claimed
// them — we refuse and the client routes to "sign in by text".
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
    if (!member || member.community_id !== community.id) {
      return NextResponse.json({ error: 'We could not find that member.' }, { status: 404 });
    }

    const applied = await setMemberPhone(member.id, phone);
    if (!applied) {
      // Already has a phone — this identity is spoken for. Verify by text.
      return NextResponse.json({ alreadyClaimed: true }, { status: 409 });
    }

    // Signed in immediately on this device.
    return NextResponse.json({
      member: { id: member.id, name: member.name, token: member.token },
      community: { code: community.code, name: community.name },
    });
  } catch (err) {
    console.error('POST /api/auth/claim-by-name error:', err);
    return NextResponse.json({ error: 'Could not complete the claim. Please try again.' }, { status: 500 });
  }
}
