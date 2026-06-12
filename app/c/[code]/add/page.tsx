import { notFound } from 'next/navigation';
import { getCommunityByCode } from '@/lib/db';
import AddVendorClient from './AddVendorClient';

export const dynamic = 'force-dynamic';

export default function AddVendorPage({
  params,
}: {
  params: { code: string };
}) {
  const community = getCommunityByCode(params.code);
  if (!community) notFound();
  return (
    <AddVendorClient
      community={{ name: community.name, code: community.code }}
    />
  );
}
