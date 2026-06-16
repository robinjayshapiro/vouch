import { NextResponse } from 'next/server';
import {
  getCommunityByCode,
  getMemberById,
  setMemberEmail,
  setMemberPhone,
} from '@/lib/db';
import { sendSignInLink } from '@/lib/signin';

export const dynamic = 'force-dynamic';

// First-time claim of a seeded member done manually at login: the person
// recognizes themselves in a suggestion that has no contact yet and supplies
// their mobile (phone sign-on) or email (email sign-on). We attach it
// (first-come, one-shot) and sign them in right here on this device — no
// delivered link required, so claiming works with no SMS/email provider
// configured. Honor-system by design, which is fine for a trust circle; the
// captured contact is what verifies later sign-ins from other devices. If the
// member already has that contact, someone has claimed them — we refuse and the
// client routes to "sign in" via the community's channel.
export async function POST(request: Request) {
  let body: { code?: string; memberId?: string; phone?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const phone = (body.phone ?? '').trim();
  const email = (body.email ?? '').trim();
  if (!phone && !email) {
    return NextResponse.json({ error: 'Please enter your contact details.' }, { status: 400 });
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

    const applied = email
      ? await setMemberEmail(member.id, email)
      : await setMemberPhone(member.id, phone);
    if (!applied) {
      // Already claimed — this identity is spoken for. Verify via the community's
      // channel using the contact already on file.
      const { devLink } = await sendSignInLink(member, community);
      return NextResponse.json(
        { alreadyClaimed: true, ...(devLink && { devLink }) },
        { status: 409 }
      );
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
