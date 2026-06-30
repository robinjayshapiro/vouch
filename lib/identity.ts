import type { StoredMember } from '@/types';

const key = (code: string) => `vouch_member_${code.toUpperCase()}`;

export function getStoredMember(code: string): StoredMember | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMember;
    if (!parsed.id || !parsed.token || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeMember(code: string, member: StoredMember): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key(code), JSON.stringify(member));
}

export interface StoredCommunity {
  code: string;
  communityName: string;
  memberName: string;
}

export function getStoredCommunities(): StoredCommunity[] {
  if (typeof window === 'undefined') return [];
  const prefix = 'vouch_member_';
  const result: StoredCommunity[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(prefix)) continue;
    const code = k.slice(prefix.length);
    if (code.length !== 6) continue;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredMember;
      if (!parsed.id || !parsed.token || !parsed.name) continue;
      result.push({
        code,
        communityName: parsed.communityName ?? code,
        memberName: parsed.name,
      });
    } catch {
      // skip corrupt entries
    }
  }
  return result;
}
