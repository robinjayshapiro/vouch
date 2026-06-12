import { notFound } from 'next/navigation';
import { getCommunityByCode } from '@/lib/db';
import CommunityClient from './CommunityClient';

export const dynamic = 'force-dynamic';

export default async function CommunityPage({
  params,
}: {
  params: { code: string };
}) {
  const community = await getCommunityByCode(params.code);
  if (!community) notFound();
  return (
    <CommunityClient
      community={{
        id: community.id,
        name: community.name,
        code: community.code,
      }}
    />
  );
}
