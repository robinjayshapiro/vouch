// Read-only: list Gates-ish communities so we pick the right code.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const { data, error } = await db
  .from('vouch_communities')
  .select('id, name, code, created_at')
  .ilike('name', '%gate%');
if (error) throw new Error(error.message);
console.log(JSON.stringify(data, null, 2));
