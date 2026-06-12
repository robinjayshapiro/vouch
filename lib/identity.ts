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
