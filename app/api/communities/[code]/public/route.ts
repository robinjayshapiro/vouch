import { NextResponse } from 'next/server';
import { getCommunityByCode } from '@/lib/db';
import { contactRequirements } from '@/lib/gating';

export const dynamic = 'force-dynamic';

// Public (no token) onboarding config: enough for the join UI to render the
// right field(s) before a join attempt. Never exposes member data.
export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const { requirePhone, requireEmail } = contactRequirements(community);
    return NextResponse.json({
      name: community.name,
      signonMethod: community.signon_method,
      requirePhone,
      requireEmail,
    });
  } catch (err) {
    console.error('GET /api/communities/[code]/public error:', err);
    return NextResponse.json({ error: 'Could not load community.' }, { status: 500 });
  }
}
