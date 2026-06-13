import { NextResponse } from 'next/server';
import { getCommunityByCode, getMemberByToken, listPendingEdits } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Admin-only: list pending vendor edits with current values for a before/after
// diff. Token passed as a query param since this is a GET.
export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try {
    const community = await getCommunityByCode(params.code);
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }
    const member = await getMemberByToken(community.id, token);
    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    }
    const edits = await listPendingEdits(community.id);
    return NextResponse.json({ edits });
  } catch (err) {
    console.error('GET /api/communities/[code]/moderation error:', err);
    return NextResponse.json({ error: 'Could not load pending edits.' }, { status: 500 });
  }
}
