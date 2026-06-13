'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { StoredMember, VendorWithStats } from '@/types';
import { getStoredMember } from '@/lib/identity';
import { CATEGORIES_BY_LABEL } from '@/lib/categories';
import JoinGate from '@/components/JoinGate';
import VendorCard from '@/components/VendorCard';
import ModerationPanel from './ModerationPanel';

export default function CommunityClient({
  community,
}: {
  community: { id: string; name: string; code: string };
}) {
  const [member, setMember] = useState<StoredMember | null>(null);
  const [checkedIdentity, setCheckedIdentity] = useState(false);
  const [vendors, setVendors] = useState<VendorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [modOpen, setModOpen] = useState(false);

  useEffect(() => {
    setMember(getStoredMember(community.code));
    setCheckedIdentity(true);
  }, [community.code]);

  // Ask the server whether the signed-in member is an admin (and how many edits
  // await review) so we can show the moderation entry.
  const refreshAdminState = useCallback(
    async (token: string) => {
      const res = await fetch(`/api/communities/${community.code}?token=${token}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setIsAdmin(data.viewerRole === 'admin');
        setPendingCount(data.pendingEdits ?? 0);
      }
    },
    [community.code]
  );

  useEffect(() => {
    if (member?.token) refreshAdminState(member.token);
  }, [member?.token, refreshAdminState]);

  const fetchVendors = useCallback(async () => {
    const params = new URLSearchParams({ code: community.code });
    if (category) params.set('category', category);
    if (q.trim()) params.set('q', q.trim());
    try {
      const res = await fetch(`/api/vendors?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setVendors(data.vendors);
    } finally {
      setLoading(false);
    }
  }, [community.code, category, q]);

  useEffect(() => {
    const timer = setTimeout(fetchVendors, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchVendors, q]);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(
        `Join "${community.name}" on Vouch: ${window.location.origin}/join/${community.code}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. http on old browsers) — code is visible anyway.
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-6">
      <header>
        <Link href="/" className="text-base font-semibold text-navy-600">
          🤝 Vouch
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-extrabold leading-tight text-ink">
            {community.name}
          </h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copyInvite}
            className="inline-flex items-center gap-2 rounded-full bg-navy-100 px-4 py-2 text-base font-semibold text-navy-800 transition-colors hover:bg-navy-200"
          >
            {copied ? '✅ Invite copied!' : `📨 Invite code: ${community.code}`}
          </button>
          {isAdmin && (
            <button
              onClick={() => setModOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-coral-100 px-4 py-2 text-base font-semibold text-coral-800 transition-colors hover:bg-coral-200"
            >
              🛠️ Review changes
              {pendingCount > 0 && (
                <span className="rounded-full bg-coral-600 px-2 text-sm font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {modOpen && member && (
        <ModerationPanel
          code={community.code}
          token={member.token}
          onClose={() => setModOpen(false)}
          onReviewed={() => {
            refreshAdminState(member.token);
            fetchVendors();
          }}
        />
      )}

      <div className="mt-5">
        <label htmlFor="vendor-search" className="sr-only">
          Search by name, category, or phone number
        </label>
        <input
          id="vendor-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search name, category, or phone…"
          className="w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-navy-500"
        />
      </div>

      <div className="mt-3">
        <label htmlFor="category-filter" className="sr-only">
          Filter by category
        </label>
        <select
          id="category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg focus:border-navy-500 ${
            category ? 'font-semibold text-navy-800' : 'text-ink'
          }`}
        >
          <option value="">All categories</option>
          {CATEGORIES_BY_LABEL.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>

      <section className="mt-4 flex flex-col gap-3" aria-live="polite">
        {loading ? (
          <p className="py-10 text-center text-lg text-soft">Loading…</p>
        ) : vendors.length > 0 ? (
          vendors.map((v) => (
            <VendorCard key={v.id} vendor={v} code={community.code} />
          ))
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center shadow-card">
            <p className="text-4xl" aria-hidden="true">
              🌱
            </p>
            <h2 className="mt-3 text-xl font-bold text-ink">
              {q || category ? 'No matches found' : 'No recommendations yet'}
            </h2>
            <p className="mt-2 text-base text-soft">
              {q || category
                ? 'Try a different search or category — or be the first to recommend someone!'
                : 'Know a great plumber, sitter, or handyman? Be the first to vouch for them!'}
            </p>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md p-4">
        <Link
          href={`/c/${community.code}/add`}
          className="block w-full rounded-2xl bg-coral-600 p-4 text-center text-lg font-bold text-white shadow-lift transition-colors hover:bg-coral-700"
        >
          Recommend someone you trust
        </Link>
      </div>

      {checkedIdentity && !member && (
        <JoinGate
          code={community.code}
          communityName={community.name}
          onJoined={setMember}
        />
      )}
    </main>
  );
}
