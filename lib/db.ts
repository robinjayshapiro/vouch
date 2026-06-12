import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  Community,
  Member,
  Vendor,
  VendorWithStats,
  VouchWithMember,
} from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var __vouchDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, 'vouch.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id),
      name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      phone TEXT,
      contact TEXT,
      added_by TEXT NOT NULL REFERENCES members(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vouches (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL REFERENCES vendors(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (vendor_id, member_id)
    );

    CREATE INDEX IF NOT EXISTS idx_members_community ON members(community_id);
    CREATE INDEX IF NOT EXISTS idx_vendors_community ON vendors(community_id);
    CREATE INDEX IF NOT EXISTS idx_vouches_vendor ON vouches(vendor_id);
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__vouchDb) globalThis.__vouchDb = createDb();
  return globalThis.__vouchDb;
}

// Unambiguous alphabet: no 0/O, 1/I/L so codes are easy to read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function createCommunity(
  name: string,
  creatorName: string
): { community: Community; member: Member } {
  const db = getDb();
  let code = randomCode();
  // Regenerate on the (rare) collision.
  while (db.prepare('SELECT 1 FROM communities WHERE code = ?').get(code)) {
    code = randomCode();
  }
  const community: Community = {
    id: randomUUID(),
    name,
    code,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    'INSERT INTO communities (id, name, code, created_at) VALUES (?, ?, ?, ?)'
  ).run(community.id, community.name, community.code, community.created_at);
  const member = joinCommunity(community.id, creatorName);
  return { community, member };
}

export function getCommunityByCode(code: string): Community | undefined {
  return getDb()
    .prepare('SELECT * FROM communities WHERE code = ?')
    .get(code.toUpperCase()) as Community | undefined;
}

export function joinCommunity(communityId: string, name: string): Member {
  const member: Member = {
    id: randomUUID(),
    community_id: communityId,
    name,
    token: randomUUID(),
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      'INSERT INTO members (id, community_id, name, token, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(member.id, member.community_id, member.name, member.token, member.created_at);
  return member;
}

export function getMemberByToken(
  communityId: string,
  token: string
): Member | undefined {
  return getDb()
    .prepare('SELECT * FROM members WHERE community_id = ? AND token = ?')
    .get(communityId, token) as Member | undefined;
}

export function getCommunityStats(communityId: string): {
  memberCount: number;
  vendorCount: number;
} {
  const db = getDb();
  const memberCount = (
    db.prepare('SELECT COUNT(*) AS n FROM members WHERE community_id = ?').get(communityId) as { n: number }
  ).n;
  const vendorCount = (
    db.prepare('SELECT COUNT(*) AS n FROM vendors WHERE community_id = ?').get(communityId) as { n: number }
  ).n;
  return { memberCount, vendorCount };
}

export function listVendors(
  communityId: string,
  opts: { category?: string; q?: string } = {}
): VendorWithStats[] {
  const clauses = ['v.community_id = ?'];
  const params: unknown[] = [communityId];
  if (opts.category) {
    clauses.push('v.category = ?');
    params.push(opts.category);
  }
  if (opts.q) {
    clauses.push('(v.name LIKE ? OR EXISTS (SELECT 1 FROM vouches vq WHERE vq.vendor_id = v.id AND vq.comment LIKE ?))');
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  const rows = getDb()
    .prepare(
      `SELECT v.*,
              COUNT(w.id) AS vouch_count,
              AVG(w.rating) AS avg_rating,
              (SELECT comment FROM vouches
                WHERE vendor_id = v.id AND comment IS NOT NULL AND comment != ''
                ORDER BY created_at DESC LIMIT 1) AS latest_comment
         FROM vendors v
         LEFT JOIN vouches w ON w.vendor_id = v.id
        WHERE ${clauses.join(' AND ')}
        GROUP BY v.id
        ORDER BY vouch_count DESC, avg_rating DESC, v.created_at DESC`
    )
    .all(...params) as VendorWithStats[];
  return rows;
}

export function getVendor(id: string): Vendor | undefined {
  return getDb().prepare('SELECT * FROM vendors WHERE id = ?').get(id) as
    | Vendor
    | undefined;
}

export function createVendor(input: {
  communityId: string;
  name: string;
  category: string;
  phone: string | null;
  contact: string | null;
  addedBy: string;
}): Vendor {
  const vendor: Vendor = {
    id: randomUUID(),
    community_id: input.communityId,
    name: input.name,
    category: input.category,
    phone: input.phone,
    contact: input.contact,
    added_by: input.addedBy,
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO vendors (id, community_id, name, category, phone, contact, added_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      vendor.id,
      vendor.community_id,
      vendor.name,
      vendor.category,
      vendor.phone,
      vendor.contact,
      vendor.added_by,
      vendor.created_at
    );
  return vendor;
}

export function listVouches(vendorId: string): VouchWithMember[] {
  return getDb()
    .prepare(
      `SELECT w.*, m.name AS member_name
         FROM vouches w
         JOIN members m ON m.id = w.member_id
        WHERE w.vendor_id = ?
        ORDER BY w.created_at DESC`
    )
    .all(vendorId) as VouchWithMember[];
}

export function upsertVouch(input: {
  vendorId: string;
  memberId: string;
  rating: number;
  comment: string | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO vouches (id, vendor_id, member_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (vendor_id, member_id)
       DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = excluded.created_at`
    )
    .run(
      randomUUID(),
      input.vendorId,
      input.memberId,
      input.rating,
      input.comment,
      new Date().toISOString()
    );
}
