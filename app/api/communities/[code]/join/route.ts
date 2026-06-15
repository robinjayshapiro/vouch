import { NextResponse } from 'next/server';
import {
  findMemberByEmail,
  findMemberByPhone,
  getCommunityByCode,
  isPhoneAllowed,
  joinCommunity,
} from '@/lib/db';
import { contactRequirements } from '@/lib/gating';
import { sendSignInLink } from '@/lib/signin';
import type { MemberStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  let body: { name?: string; phone?: string; email?: string };
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
  const email = (body.email ?? '').trim().slice(0, 120) || null;

  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json(
        { error: 'We could not find a community with that code. Double-check it and try again.' },
        { status: 404 }
      );
    }

    // Which contact fields this community requires (derived from the two axes).
    // Messages carry the phrase the join UIs key on to surface the right field.
    const { requirePhone, requireEmail } = contactRequirements(community);
    if (requireEmail && !email) {
      return NextResponse.json(
        { error: 'This community asks for your email address to join.' },
        { status: 400 }
      );
    }
    if (requirePhone && !phone) {
      return NextResponse.json(
        { error: 'This community asks for your mobile number to join.' },
        { status: 400 }
      );
    }

    // If the sign-on contact already belongs to a member, this is a returning
    // person — send them a sign-in link instead of creating a duplicate.
    if (community.signon_method === 'email' && email) {
      const existing = await findMemberByEmail(community.id, email);
      if (existing) {
        await sendSignInLink(existing, community);
        return NextResponse.json(
          {
            signin: true,
            name: existing.name,
            message: `That email is already registered to ${existing.name}. We just emailed a sign-in link.`,
          },
          { status: 409 }
        );
      }
    } else if (community.signon_method === 'phone' && phone) {
      const existing = await findMemberByPhone(community.id, phone);
      if (existing) {
        await sendSignInLink(existing, community);
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

    // Decide approval status from the community's join policy.
    let status: MemberStatus = 'approved';
    if (community.join_policy === 'admin_approval') {
      status = 'pending';
    } else if (community.join_policy === 'approved_list') {
      status = phone && (await isPhoneAllowed(community.id, phone)) ? 'approved' : 'pending';
    }

    const member = await joinCommunity(community.id, name, phone, status, email);
    return NextResponse.json({
      community: { id: community.id, name: community.name, code: community.code },
      member: { id: member.id, name: member.name, token: member.token },
      status,
    });
  } catch (err) {
    console.error('POST /api/communities/[code]/join error:', err);
    return NextResponse.json({ error: 'Could not join community. Please try again.' }, { status: 500 });
  }
}
