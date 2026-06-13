// Generate personal claim links for every member of the Gates Ridge community
// so Robin can text them out (e.g. in the WhatsApp group). Each link signs the
// recipient in as that member and prompts them to add their mobile number.
//
// Run: node scripts/gates-claim-links.mjs
// Output: one "Name<TAB>link" row per member, paste-ready.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const CODE = process.argv[2] ?? 'GATES2';
const APP_URL = (env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const TTL_DAYS = 30;

async function main() {
  const { data: community, error: cErr } = await db
    .from('vouch_communities')
    .select('id, name')
    .eq('code', CODE)
    .single();
  if (cErr) throw new Error(`Community ${CODE}: ${cErr.message}`);

  const { data: members, error: mErr } = await db
    .from('vouch_members')
    .select('id, name')
    .eq('community_id', community.id)
    .order('name');
  if (mErr) throw new Error(mErr.message);

  const expires = new Date(Date.now() + TTL_DAYS * 86_400_000).toISOString();
  const rows = members.map((m) => ({
    member_id: m.id,
    token: randomUUID(),
    expires_at: expires,
  }));

  const { data: tokens, error: tErr } = await db
    .from('vouch_login_tokens')
    .insert(rows)
    .select('member_id, token');
  if (tErr) throw new Error(tErr.message);

  const byMember = new Map(tokens.map((t) => [t.member_id, t.token]));
  console.error(`# ${community.name} — ${members.length} claim links (valid ${TTL_DAYS} days)\n`);
  for (const m of members) {
    console.log(`${m.name}\t${APP_URL}/claim/${byMember.get(m.id)}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
