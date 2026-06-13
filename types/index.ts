export interface Community {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export type MemberRole = 'member' | 'admin';

export interface Member {
  id: string;
  community_id: string;
  name: string;
  token: string;
  phone: string | null;
  role: MemberRole;
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

/** A possible existing member surfaced during name-claim onboarding. Never carries token/phone. */
export interface MemberSuggestion {
  id: string;
  name: string;
  vouchCount: number;
  hasPhone: boolean;
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
