import { NextResponse } from 'next/server';
import {
  createLoginToken,
  findMemberByPhone,
  getCommunityByCode,
  joinCommunity,
} from '@/lib/db';
import { appUrl, sendSms, signInMessage } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  let body: { name?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name || name.length > 40) {
    return NextResponse.json(
      { error: 'Please tell us your name (up to 40 characters).' },
      { status: 400 }
    );
  }
  const phone = (body.phone ?? '').trim().slice(0, 30) || null;

  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json(
        { error: 'We could not find a community with that code. Double-check it and try again.' },
        { status: 404 }
      );
    }

    // If that mobile already belongs to a member, this is a returning person —
    // text them a sign-in link instead of creating a duplicate.
    if (phone) {
      const existing = await findMemberByPhone(community.id, phone);
      if (existing) {
        const token = await createLoginToken(existing.id, 15);
        await sendSms(phone, signInMessage(community.name, `${appUrl()}/claim/${token}`));
        return NextResponse.json(
          {
            signin: true,
            name: existing.name,
            message: `That number is already registered to ${existing.name}. We just texted a sign-in link.`,
          },
          { status: 409 }
        );
      }
    }

    const member = await joinCommunity(community.id, name, phone);
    return NextResponse.json({
      community: { id: community.id, name: community.name, code: community.code },
      member: { id: member.id, name: member.name, token: member.token },
    });
  } catch (err) {
    console.error('POST /api/communities/[code]/join error:', err);
    return NextResponse.json({ error: 'Could not join community. Please try again.' }, { status: 500 });
  }
}
