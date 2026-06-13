import { NextResponse } from 'next/server';
import { getCommunityByCode, getMemberByToken, setMemberPhone } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Attach a mobile number to the signed-in member so they can sign in by text
// later. Used on the claim page when a member arrives via a directly-issued
// link (e.g. Robin's texted claim links) and has no phone on file yet.
// Token-validated like every other write; one-shot via setMemberPhone.
export async function POST(request: Request) {
  let body: { code?: string; token?: string; phone?: string };
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
    const member = await getMemberByToken(community.id, body.token ?? '');
    if (!member) {
      return NextResponse.json(
        { error: 'We could not verify you. Try your sign-in link again.' },
        { status: 401 }
      );
    }
    await setMemberPhone(member.id, phone);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/phone error:', err);
    return NextResponse.json({ error: 'Could not save your number. Please try again.' }, { status: 500 });
  }
}
