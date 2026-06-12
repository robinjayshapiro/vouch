'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { StoredMember, VendorWithStats } from '@/types';
import { getStoredMember } from '@/lib/identity';
import { CATEGORIES } from '@/lib/categories';
import JoinGate from '@/components/JoinGate';
import VendorCard from '@/components/VendorCard';

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

  useEffect(() => {
    setMember(getStoredMember(community.code));
    setCheckedIdentity(true);
  }, [community.code]);

  const fetchVendors = useCallback(async () => {
    const params = new URLSearchParams({ code: community.code });
    if (category) params.set('category', category);
    if (q.trim()) params.set('q', q.trim());
    try {
      const res = await fetch(`/api/vendors?${params.toString()}`);
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
        `Join "${community.name}" on Vouch! Go to ${window.location.origin} and enter code ${community.code}`
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
        <Link href="/" className="text-base font-semibold text-pine-600">
          🤝 Vouch
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-extrabold leading-tight text-ink">
            {community.name}
          </h1>
        </div>
        <button
          onClick={copyInvite}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-pine-100 px-4 py-2 text-base font-semibold text-pine-800 transition-colors hover:bg-pine-200"
        >
          {copied ? '✅ Invite copied!' : `📨 Invite code: ${community.code}`}
        </button>
      </header>

      <div className="mt-5">
        <label htmlFor="vendor-search" className="sr-only">
          Search for a pro
        </label>
        <input
          id="vendor-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search by name…"
          className="w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500"
        />
      </div>

      <div
        className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2"
        role="group"
        aria-label="Filter by category"
      >
        <button
          onClick={() => setCategory('')}
          aria-pressed={category === ''}
          className={`shrink-0 rounded-full px-4 py-2.5 text-base font-semibold transition-colors ${
            category === ''
              ? 'bg-pine-700 text-white'
              : 'bg-white text-ink shadow-card'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(category === c.id ? '' : c.id)}
            aria-pressed={category === c.id}
            className={`shrink-0 rounded-full px-4 py-2.5 text-base font-semibold transition-colors ${
              category === c.id
                ? 'bg-pine-700 text-white'
                : 'bg-white text-ink shadow-card'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
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
          className="block w-full rounded-2xl bg-honey-500 p-4 text-center text-lg font-bold text-ink shadow-lift transition-colors hover:bg-honey-600"
        >
          ➕ Recommend someone you trust
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
