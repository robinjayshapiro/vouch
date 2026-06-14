// Adds Robin Shapiro as an admin in the Gates community.
// Usage: node scripts/add-robin-admin.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import crypto from 'crypto';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const COMMUNITY_CODE = 'GATES2';
const NAME = 'Robin Shapiro';
const PHONE = '914-419-6318';

async function main() {
  const { data: community, error: cErr } = await db
    .from('vouch_communities')
    .select('id, name, code')
    .eq('code', COMMUNITY_CODE)
    .single();
  if (cErr || !community) throw new Error(cErr?.message || 'Community not found');
  console.log(`Found community: ${community.name} (${community.code})`);

  const digits = PHONE.replace(/\D/g, '').slice(-10);
  const { data: members, error: mErr } = await db
    .from('vouch_members')
    .select('id, name, phone, role, status')
    .eq('community_id', community.id);
  if (mErr) throw new Error(mErr.message);

  const existing = members.find(
    (m) => m.phone && m.phone.replace(/\D/g, '').slice(-10) === digits
  );

  if (existing) {
    const { error: uErr } = await db
      .from('vouch_members')
      .update({ role: 'admin', status: 'approved', name: NAME, phone: PHONE })
      .eq('id', existing.id);
    if (uErr) throw new Error(uErr.message);
    console.log(`Promoted existing member ${existing.id} -> admin.`);
    const { data: tok } = await db
      .from('vouch_members')
      .select('token')
      .eq('id', existing.id)
      .single();
    console.log(`Sign-in link: /claim-member/${tok?.token}  (or use SMS sign-in)`);
    return;
  }

  const token = crypto.randomUUID();
  const { data: created, error: iErr } = await db
    .from('vouch_members')
    .insert({
      community_id: community.id,
      name: NAME,
      phone: PHONE,
      token,
      role: 'admin',
      status: 'approved',
    })
    .select('id, token')
    .single();
  if (iErr) throw new Error(iErr.message);

  console.log(`Created admin member ${created.id}`);
  console.log(`Member token: ${created.token}`);
  console.log(`On your device, visit /c/${COMMUNITY_CODE} then sign in by SMS with ${PHONE}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
