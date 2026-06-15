import { NextResponse } from 'next/server';
import {
  getCommunityByCode,
  getMemberByToken,
  setMemberEmail,
  setMemberPhone,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

// Attach a contact (mobile or email) to the signed-in member so they can sign
// in on another device later. Used on the claim page when a member arrives via
// a directly-issued link and has no contact on the community's sign-on channel
// yet. Token-validated like every other write; one-shot via setMemberPhone/Email.
export async function POST(request: Request) {
  let body: { code?: string; token?: string; phone?: string; email?: string };
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
    const member = await getMemberByToken(community.id, body.token ?? '');
    if (!member) {
      return NextResponse.json(
        { error: 'We could not verify you. Try your sign-in link again.' },
        { status: 401 }
      );
    }
    if (email) await setMemberEmail(member.id, email);
    else await setMemberPhone(member.id, phone);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/phone error:', err);
    return NextResponse.json({ error: 'Could not save your contact. Please try again.' }, { status: 500 });
  }
}
