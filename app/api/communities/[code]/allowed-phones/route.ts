import { NextResponse } from 'next/server';
import {
  addAllowedPhones,
  getCommunityByCode,
  getMemberByToken,
  removeAllowedPhone,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

async function requireAdmin(code: string, token: string) {
  const community = await getCommunityByCode(code);
  if (!community) return { error: 'Community not found.', status: 404 as const };
  const member = await getMemberByToken(community.id, token);
  if (!member || member.role !== 'admin')
    return { error: 'Admins only.', status: 403 as const };
  return { community };
}

// Split a pasted blob into individual phone numbers (commas, newlines, etc.).
function parsePhones(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\D/g, '').length >= 7)
    .slice(0, 1000);
}

// Admin: add numbers to the allowlist (paste a blob).
export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  let body: { token?: string; phones?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  try {
    const r = await requireAdmin(params.code, body.token ?? '');
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    const phones = parsePhones(body.phones ?? '');
    if (phones.length === 0) {
      return NextResponse.json({ error: 'No valid phone numbers found.' }, { status: 400 });
    }
    const added = await addAllowedPhones(r.community.id, phones);
    return NextResponse.json({ added, parsed: phones.length });
  } catch (err) {
    console.error('POST /api/communities/[code]/allowed-phones error:', err);
    return NextResponse.json({ error: 'Could not update the list.' }, { status: 500 });
  }
}

// Admin: remove one number from the allowlist.
export async function DELETE(
  request: Request,
  { params }: { params: { code: string } }
) {
  let body: { token?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  try {
    const r = await requireAdmin(params.code, body.token ?? '');
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    if (body.id) await removeAllowedPhone(r.community.id, body.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/communities/[code]/allowed-phones error:', err);
    return NextResponse.json({ error: 'Could not update the list.' }, { status: 500 });
  }
}
