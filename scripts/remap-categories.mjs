// Recategorize the already-seeded Gates vendors after expanding the category
// list. The stored category is the OLD bucket, so we recover the original
// spreadsheet "Type" from scripts/gates-data.json (matched by phone, then by
// name) and recompute the category with the current type-map.
//
// Run: node scripts/remap-categories.mjs        (dry run — prints changes)
//      node scripts/remap-categories.mjs --apply (writes updates)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { mapType } from './type-map.mjs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const CODE = 'GATES2';
const APPLY = process.argv.includes('--apply');
const digits = (p) => (p ?? '').replace(/\D/g, '').slice(-10);

async function main() {
  const rows = JSON.parse(readFileSync('scripts/gates-data.json', 'utf8'));
  // Build lookups from the source data: phone -> type, and name -> type.
  const byPhone = new Map();
  const byName = new Map();
  for (const r of rows) {
    const name = r.name || r.contact || r.type;
    const d = digits((r.phone ?? '').split('/')[0]);
    if (d.length >= 7 && !byPhone.has(d)) byPhone.set(d, r.type);
    if (name && !byName.has(name)) byName.set(name, r.type);
  }

  const { data: community } = await db
    .from('vouch_communities')
    .select('id')
    .eq('code', CODE)
    .single();
  const { data: vendors, error } = await db
    .from('vouch_vendors')
    .select('id, name, phone, category')
    .eq('community_id', community.id);
  if (error) throw new Error(error.message);

  const updates = [];
  let unmatched = 0;
  for (const v of vendors) {
    const type = byPhone.get(digits(v.phone)) ?? byName.get(v.name);
    if (!type) { unmatched++; continue; }
    const next = mapType(type);
    if (next !== v.category) updates.push({ id: v.id, name: v.name, from: v.category, to: next, type });
  }

  for (const u of updates) {
    console.log(`${u.from.padEnd(12)} → ${u.to.padEnd(14)} ${u.name}  (${u.type})`);
  }
  console.log(`\n${updates.length} to change, ${unmatched} unmatched, ${vendors.length} total.`);

  if (!APPLY) {
    console.log('Dry run. Re-run with --apply to write.');
    return;
  }
  for (const u of updates) {
    const { error: uErr } = await db
      .from('vouch_vendors')
      .update({ category: u.to })
      .eq('id', u.id);
    if (uErr) throw new Error(`${u.name}: ${uErr.message}`);
  }
  console.log('Applied.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
