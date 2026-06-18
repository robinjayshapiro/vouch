// Magic-link delivery, channel-chosen by the community's sign-on mechanism.
// One place decides SMS vs email so the join, sign-in, and claim flows stay
// consistent.
//
// Returns `{ devLink }`: the claim URL is exposed to the caller ONLY in local
// dev when the provider didn't actually deliver (no Twilio/Resend configured),
// so the UI can offer a "tap here to sign in" shortcut instead of forcing a trip
// to the server logs. It is null for 'off', a missing contact, a delivered
// message, or production — so a prod response can never be used to probe which
// contacts exist.

import { createLoginToken } from '@/lib/db';
import { appUrl, sendSms, signInMessage } from '@/lib/sms';
import { sendEmail, signInEmail } from '@/lib/email';
import type { Community, Member } from '@/types';

export interface SignInResult {
  devLink: string | null;
}

function devLinkFrom(delivered: boolean, link: string): string | null {
  return !delivered && process.env.NODE_ENV !== 'production' ? link : null;
}

export async function sendSignInLink(
  member: Member,
  community: Pick<Community, 'name' | 'signon_method'>
): Promise<SignInResult> {
  if (community.signon_method === 'email') {
    if (!member.email) return { devLink: null };
    const token = await createLoginToken(member.id, 15);
    const link = `${appUrl()}/claim/${token}`;
    const { subject, text } = signInEmail(community.name, link);
    const { delivered } = await sendEmail(member.email, subject, text);
    return { devLink: devLinkFrom(delivered, link) };
  }

  if (community.signon_method === 'phone') {
    if (!member.phone) return { devLink: null };
    const token = await createLoginToken(member.id, 15);
    const link = `${appUrl()}/claim/${token}`;
    const { delivered } = await sendSms(member.phone, signInMessage(community.name, link));
    return { devLink: devLinkFrom(delivered, link) };
  }

  // 'off' — no magic-link sign-in.
  return { devLink: null };
}
