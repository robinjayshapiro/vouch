export type JoinPolicy = 'open' | 'admin_approval' | 'approved_list';

/** How members log back in via magic link — independent of the approval gate. */
export type SignonMethod = 'off' | 'email' | 'phone';

export interface Community {
  id: string;
  name: string;
  code: string;
  join_policy: JoinPolicy;
  signon_method: SignonMethod;
  created_at: string;
}

export type MemberRole = 'member' | 'admin';
export type MemberStatus = 'approved' | 'pending';

export interface Member {
  id: string;
  community_id: string;
  name: string;
  token: string;
  phone: string | null;
  email: string | null;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
}

/** A member awaiting approval, shown in the admin queue. */
export interface PendingMember {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

/** Editable shared fields of a vendor. */
export interface VendorEditChanges {
  name?: string;
  category?: string;
  phone?: string | null;
  contact?: string | null;
}

/** A pending vendor edit shown to admins, with current values for a before/after diff. */
export interface PendingVendorEdit {
  id: string;
  vendor_id: string;
  proposed_by_name: string;
  created_at: string;
  changes: VendorEditChanges;
  current: { name: string; category: string; phone: string | null; contact: string | null };
}

/** A possible existing member surfaced during name-claim onboarding. Never carries token/phone/email. */
export interface MemberSuggestion {
  id: string;
  name: string;
  vouchCount: number;
  hasPhone: boolean;
  hasEmail: boolean;
}

/** What the client stores in localStorage — never includes other members' tokens. */
export interface StoredMember {
  id: string;
  name: string;
  token: string;
}

export interface Vendor {
  id: string;
  community_id: string;
  name: string;
  category: string;
  phone: string | null;
  contact: string | null;
  added_by: string;
  created_at: string;
}

export interface VendorWithStats extends Vendor {
  vouch_count: number;
  avg_rating: number | null;
  latest_comment: string | null;
  // Names of members who vouched, most recent first (deduped). Drives the
  // "Vouched by …" trust line on directory cards.
  voucher_names: string[];
}

export type RequestStatus = 'open' | 'closed';

export interface VouchRequest {
  id: string;
  community_id: string;
  category: string;
  note: string | null;
  asked_by: string;
  status: RequestStatus;
  created_at: string;
}

/** A request plus the asker's name and how many vendors have been recommended. */
export interface RequestSummary {
  id: string;
  category: string;
  note: string | null;
  asked_by: string;
  asked_by_name: string;
  status: RequestStatus;
  created_at: string;
  response_count: number;
}

/** Full request detail for the ask page: summary + recommended vendors with stats. */
export interface RequestDetail extends RequestSummary {
  responses: VendorWithStats[];
}

export interface Vouch {
  id: string;
  vendor_id: string;
  member_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface VouchWithMember extends Vouch {
  member_name: string;
}
