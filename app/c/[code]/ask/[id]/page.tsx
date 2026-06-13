import { notFound } from 'next/navigation';
import { getCommunityByCode, getRequest } from '@/lib/db';
import AskClient from './AskClient';

export const dynamic = 'force-dynamic';

export default async function AskPage({
  params,
}: {
  params: { code: string; id: string };
}) {
  const community = await getCommunityByCode(params.code);
  if (!community) notFound();
  const req = await getRequest(params.id);
  if (!req || req.community_id !== community.id) notFound();
  return (
    <AskClient
      community={{ name: community.name, code: community.code }}
      requestId={params.id}
    />
  );
}
