// One-off seeder: loads Gates Ridge Civic Association vendor list
// (scripts/gates-data.json, exported from the Excel sheet) into Supabase.
// Run: node scripts/seed-gates.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const COMMUNITY = { name: 'Gates Ridge Civic Association', code: 'GATES2' };

// Map spreadsheet "Type" values onto Vouch categories.
const TYPE_MAP = [
  [/plumb/i, 'plumbing'],
  [/electric/i, 'electrical'],
  [/hvac|boiler|generator|propane|insulation|water filtration/i, 'hvac'],
  [/handyman|grout|contractor|garage door|shower door|closet|driveway|mason|chimney|fireplace|outdoor kitche|tennis|architect/i, 'handyman'],
  [/clean|power wash|gutter|vent|sanitation/i, 'cleaning'],
  [/landscap|tree|sprinkler|snow|lawn|christmas lights|exteriror lights|pool/i, 'landscaping'],
  [/roof/i, 'roofing'],
  [/paint/i, 'painting'],
  [/exterminator|pest|mosquito|animal|mold/i, 'pest'],
  [/appliance|dryer|repair maintenance/i, 'appliance'],
  [/babysit|child/i, 'childcare'],
  [/pet/i, 'petcare'],
  [/mechanic|car detailer|car lease|airport car/i, 'auto'],
  [/moving|hauling|shrink wrap|unwrapping/i, 'moving'],
  [/av|sonos|camera|tech|computer/i, 'tech'],
];
const toCategory = (type) =>
  (TYPE_MAP.find(([re]) => re.test(type ?? '')) ?? [null, 'other'])[1];

const digits = (p) => (p ?? '').replace(/\D/g, '').slice(-10);

async function main() {
  const rows = JSON.parse(readFileSync('scripts/gates-data.json', 'utf8'));

  const { data: community, error: cErr } = await db
    .from('vouch_communities')
    .insert(COMMUNITY)
    .select()
    .single();
  if (cErr) throw new Error(cErr.message);
  console.log(`Community ${community.name} (${community.code})`);

  // One member per unique recommender, plus a fallback for blank rows.
  const memberIds = new Map();
  const names = [...new Set(rows.map((r) => r.recommender || 'Gates Directory'))];
  for (const name of names) {
    const { data, error } = await db
      .from('vouch_members')
      .insert({ community_id: community.id, name, token: crypto.randomUUID() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    memberIds.set(name, data.id);
  }
  console.log(`${memberIds.size} members`);

  const seenPhones = new Map(); // digits -> vendor id
  let vendors = 0;
  let vouches = 0;
  for (const r of rows) {
    const memberName = r.recommender || 'Gates Directory';
    const memberId = memberIds.get(memberName);
    const vendorName = r.name || r.contact || r.type;
    const comment =
      [r.notes, r.contact && r.contact !== vendorName ? `Ask for ${r.contact}.` : null]
        .filter(Boolean)
        .join(' ') || null;

    const d = digits(r.phone);
    if (d.length >= 7 && seenPhones.has(d)) {
      // Same phone already in the directory — add this person's vouch instead.
      await db.from('vouch_vouches').upsert(
        { vendor_id: seenPhones.get(d), member_id: memberId, rating: 5, comment },
        { onConflict: 'vendor_id,member_id' }
      );
      vouches++;
      continue;
    }

    const { data: vendor, error } = await db
      .from('vouch_vendors')
      .insert({
        community_id: community.id,
        name: vendorName,
        category: toCategory(r.type),
        phone: r.phone,
        contact: null,
        added_by: memberId,
      })
      .select()
      .single();
    if (error) throw new Error(`${vendorName}: ${error.message}`);
    if (d.length >= 7) seenPhones.set(d, vendor.id);
    vendors++;

    const { error: vErr } = await db.from('vouch_vouches').insert({
      vendor_id: vendor.id,
      member_id: memberId,
      rating: 5,
      comment,
    });
    if (vErr) throw new Error(vErr.message);
    vouches++;
  }
  console.log(`${vendors} vendors, ${vouches} vouches. Done.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
