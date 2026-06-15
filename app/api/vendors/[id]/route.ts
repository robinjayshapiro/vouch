import { NextResponse } from 'next/server';
import { getVendor, listVouches } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const vendor = await getVendor(params.id);
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
  }
  const vouches = (await listVouches(vendor.id)).map((v) => ({
    id: v.id,
    member_id: v.member_id,
    member_name: v.member_name,
    tags: v.tags,
    comment: v.comment,
    created_at: v.created_at,
  }));
  return NextResponse.json({ vendor, vouches });
}
