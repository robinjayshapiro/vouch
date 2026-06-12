import { notFound } from 'next/navigation';
import { getCommunityByCode, getVendor } from '@/lib/db';
import VendorClient from './VendorClient';

export const dynamic = 'force-dynamic';

export default async function VendorPage({
  params,
}: {
  params: { code: string; id: string };
}) {
  const community = await getCommunityByCode(params.code);
  if (!community) notFound();
  const vendor = await getVendor(params.id);
  if (!vendor || vendor.community_id !== community.id) notFound();
  return (
    <VendorClient
      community={{ name: community.name, code: community.code }}
      vendorId={vendor.id}
    />
  );
}
