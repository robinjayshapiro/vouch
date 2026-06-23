// Transactional notifications for membership events. All functions are
// fire-and-don't-fail: a delivery error is logged but never bubbles up to
// block the action that triggered it (approval, join, etc.).
//
// Channel selection mirrors sendSignInLink: community.signon_method picks
// SMS or email so notifications arrive on the channel the member already
// expects to hear from.

import { createLoginToken, listAdmins } from '@/lib/db';
import { appUrl, sendSms, approvalMessage, adminPendingMessage } from '@/lib/sms';
import { sendEmail, approvalEmail, adminPendingEmail } from '@/lib/email';
import type { Community, Member } from '@/types';

// Sends the approved member a sign-in link that also serves as their welcome
// message. If the community is signon_method='off' we can't deliver anything,
// so the member is silently approved and will see the directory next load.
export async function notifyMemberApproved(
  member: Member,
  community: Pick<Community, 'name' | 'code' | 'signon_method'>
): Promise<void> {
  try {
    if (community.signon_method === 'email' && member.email) {
      const token = await createLoginToken(member.id, 60);
      const link = `${appUrl()}/claim/${token}`;
      const { subject, text } = approvalEmail(community.name, link);
      await sendEmail(member.email, subject, text);
    } else if (community.signon_method === 'phone' && member.phone) {
      const token = await createLoginToken(member.id, 60);
      const link = `${appUrl()}/claim/${token}`;
      await sendSms(member.phone, approvalMessage(community.name, link));
    }
    // signon_method='off' or no contact: silently approved, no notification possible.
  } catch (err) {
    console.error('[notify] notifyMemberApproved failed:', err);
  }
}

// Notifies all admins (who have a contact on the community's channel) that a
// new member is pending review. Fire-and-forget.
export async function notifyAdminsOfJoinRequest(
  community: Pick<Community, 'id' | 'name' | 'code' | 'signon_method'>,
  joinerName: string
): Promise<void> {
  const reviewUrl = `${appUrl()}/c/${community.code}`;
  try {
    const admins = await listAdmins(community.id);
    await Promise.allSettled(
      admins.map((admin) => {
        if (community.signon_method === 'email' && admin.email) {
          const { subject, text } = adminPendingEmail(community.name, joinerName, reviewUrl);
          return sendEmail(admin.email, subject, text);
        }
        if (community.signon_method === 'phone' && admin.phone) {
          return sendSms(admin.phone, adminPendingMessage(community.name, joinerName, reviewUrl));
        }
        return Promise.resolve();
      })
    );
  } catch (err) {
    console.error('[notify] notifyAdminsOfJoinRequest failed:', err);
  }
}
