export interface Community {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Member {
  id: string;
  community_id: string;
  name: string;
  token: string;
  phone: string | null;
  created_at: string;
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
