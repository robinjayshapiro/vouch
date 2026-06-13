import ClaimClient from './ClaimClient';

export const dynamic = 'force-dynamic';

// The magic-link landing page. All work happens client-side so we can write
// the restored identity to localStorage before redirecting into the community.
export default function ClaimPage({ params }: { params: { token: string } }) {
  return <ClaimClient token={params.token} />;
}
