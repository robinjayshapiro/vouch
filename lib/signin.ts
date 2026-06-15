// Magic-link delivery, channel-chosen by the community's sign-on mechanism.
// One place decides SMS vs email so the join, sign-in, and claim flows stay
// consistent. Returns whether a link was actually dispatched (false for 'off'
// or when the member has no contact on the selected channel).

import { createLoginToken } from '@/lib/db';
import { appUrl, sendSms, signInMessage } from '@/lib/sms';
import { sendEmail, signInEmail } from '@/lib/email';
import type { Community, Member } from '@/types';

export async function sendSignInLink(
  member: Member,
  community: Pick<Community, 'name' | 'signon_method'>
): Promise<boolean> {
  if (community.signon_method === 'email') {
    if (!member.email) return false;
    const token = await createLoginToken(member.id, 15);
    const { subject, text } = signInEmail(
      community.name,
      `${appUrl()}/claim/${token}`
    );
    await sendEmail(member.email, subject, text);
    return true;
  }

  if (community.signon_method === 'phone') {
    if (!member.phone) return false;
    const token = await createLoginToken(member.id, 15);
    await sendSms(member.phone, signInMessage(community.name, `${appUrl()}/claim/${token}`));
    return true;
  }

  // 'off' — no magic-link sign-in.
  return false;
}
