import { getCommunityByCode } from '@/lib/db';
import LandingPage from '@/components/LandingPage';

export const dynamic = 'force-dynamic';

// Shareable invite link. Lands on the join form with the code pre-filled and,
// when the code is valid, greets the person by community name. Unknown codes
// still render the join form (pre-filled) so a typo'd link is recoverable.
export default async function JoinByLinkPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase();
  const community = await getCommunityByCode(code).catch(() => undefined);
  return (
    <LandingPage
      initialMode="join"
      initialCode={code}
      communityName={community?.name}
    />
  );
}
