// Pure derivation of which contact fields a join requires, from the two
// independent axes: the approval policy and the sign-on mechanism.
//   - email is required when email sign-on is selected
//   - phone is required when phone sign-on is selected, OR the approved-phone
//     list is the gate (the allowlist matches on phone)
// Both can be true at once (e.g. approved_list + email sign-on).

import type { Community } from '@/types';

export interface ContactRequirements {
  requirePhone: boolean;
  requireEmail: boolean;
}

export function contactRequirements(
  community: Pick<Community, 'join_policy' | 'signon_method'>
): ContactRequirements {
  return {
    requirePhone:
      community.signon_method === 'phone' ||
      community.join_policy === 'approved_list',
    requireEmail: community.signon_method === 'email',
  };
}
