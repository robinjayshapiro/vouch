import { notFound } from 'next/navigation';
import { getCommunityByCode } from '@/lib/db';
import CommunityClient from './CommunityClient';

export const dynamic = 'force-dynamic';

export default function CommunityPage({
  params,
}: {
  params: { code: string };
}) {
  const community = getCommunityByCode(params.code);
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
