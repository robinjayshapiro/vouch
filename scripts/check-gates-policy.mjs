import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
const { data } = await db
  .from('vouch_communities')
  .select('name, code, join_policy')
  .ilike('name', '%gate%');
console.log(JSON.stringify(data, null, 2));
