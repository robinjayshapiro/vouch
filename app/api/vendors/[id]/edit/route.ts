import { NextResponse } from 'next/server';
import {
  getCommunityByCode,
  getMemberByToken,
  getVendor,
  proposeVendorEdit,
  updateVendorFields,
} from '@/lib/db';
import type { VendorEditChanges } from '@/types';

export const dynamic = 'force-dynamic';

// Suggest an edit to a vendor's shared fields. Admins and the member who
// originally added the vendor apply changes immediately; everyone else's edit
// is queued as pending for an admin to review.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: { code?: string; token?: string; changes?: VendorEditChanges };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!body.changes || typeof body.changes !== 'object') {
    return NextResponse.json({ error: 'No changes provided.' }, { status: 400 });
  }

  try {
    const community = await getCommunityByCode(body.code ?? '');
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const member = await getMemberByToken(community.id, body.token ?? '');
    if (!member) {
      return NextResponse.json(
        { error: 'We could not verify you. Try rejoining the community.' },
        { status: 401 }
      );
    }
    const vendor = await getVendor(params.id);
    if (!vendor || vendor.community_id !== community.id) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
    }

    const canApplyDirectly = member.role === 'admin' || vendor.added_by === member.id;
    if (canApplyDirectly) {
      await updateVendorFields(vendor.id, body.changes);
      return NextResponse.json({ applied: true });
    }

    await proposeVendorEdit({
      communityId: community.id,
      vendorId: vendor.id,
      proposedBy: member.id,
      changes: body.changes,
    });
    return NextResponse.json({ pending: true });
  } catch (err) {
    console.error('POST /api/vendors/[id]/edit error:', err);
    return NextResponse.json({ error: 'Could not save your edit. Please try again.' }, { status: 500 });
  }
}
