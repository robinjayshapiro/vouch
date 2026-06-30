'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { RequestSummary, StoredMember, VendorWithStats } from '@/types';
import { getStoredMember } from '@/lib/identity';
import { CATEGORIES_BY_LABEL, getCategory } from '@/lib/categories';
import JoinGate from '@/components/JoinGate';
import VendorCard from '@/components/VendorCard';
import ModerationPanel from './ModerationPanel';
import AskGroupModal from './AskGroupModal';
import SettingsPanel from './SettingsPanel';

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

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
  const [pendingMembers, setPendingMembers] = useState(0);
  const [viewerStatus, setViewerStatus] = useState<'approved' | 'pending' | null>(null);
  // True once we've heard back from the server about the viewer's status.
  // Without this the directory flashes for pending members before the gate kicks in.
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openRequests, setOpenRequests] = useState<RequestSummary[]>([]);
  const [voucherFilter, setVoucherFilter] = useState<string | null>(null);

  useEffect(() => {
    setMember(getStoredMember(community.code));
    setCheckedIdentity(true);
  }, [community.code]);

  // Ask the server about the viewer (role/status) and admin counts so we can
  // show moderation/settings entries or a pending-approval screen.
  const refreshAdminState = useCallback(
    async (token: string) => {
      const res = await fetch(`/api/communities/${community.code}?token=${token}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setIsAdmin(data.viewerRole === 'admin');
        setPendingCount(data.pendingEdits ?? 0);
        setPendingMembers(data.pendingMembers ?? 0);
        setViewerStatus(data.viewerStatus ?? null);
      }
      setViewerLoaded(true);
    },
    [community.code]
  );

  useEffect(() => {
    if (member?.token) refreshAdminState(member.token);
  }, [member?.token, refreshAdminState]);

  const loadRequests = useCallback(async () => {
    const res = await fetch(`/api/communities/${community.code}/requests`, {
      cache: 'no-store',
    });
    const data = await res.json();
    if (res.ok) setOpenRequests(data.requests);
  }, [community.code]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

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

  function handleVoucherClick(fullName: string) {
    setVoucherFilter(fullName);
    setQ('');
    setCategory('');
  }

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

  // While we're checking whether the signed-in viewer is approved, hold the
  // directory back — otherwise it flashes for pending members before the gate.
  if (member && !viewerLoaded) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5">
        <p className="text-lg text-soft">Loading…</p>
      </main>
    );
  }

  // Pending members wait for an organizer before they can see the directory.
  if (viewerStatus === 'pending') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="text-5xl" aria-hidden="true">⏳</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">You&apos;re on the list!</h1>
        <p className="mt-2 text-lg text-soft">
          {community.name} approves new members. An organizer will let you in
          shortly — check back soon.
        </p>
      </main>
    );
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
          {member && (
            <span className="mt-1 shrink-0 rounded-full bg-navy-100 px-3 py-1.5 text-sm font-semibold text-navy-700">
              {shortName(member.name)}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copyInvite}
            className="inline-flex items-center gap-2 rounded-full bg-navy-100 px-4 py-2 text-base font-semibold text-navy-800 transition-colors hover:bg-navy-200"
          >
            {copied ? '✅ Invite copied!' : `📨 Invite code: ${community.code}`}
          </button>
          {member && (
            <button
              onClick={() => setAskOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-coral-600 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-coral-700"
            >
              🙋 Ask the group
            </button>
          )}
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
          {isAdmin && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-navy-100 px-4 py-2 text-base font-semibold text-navy-800 transition-colors hover:bg-navy-200"
            >
              ⚙️ Settings
              {pendingMembers > 0 && (
                <span className="rounded-full bg-coral-600 px-2 text-sm font-bold text-white">
                  {pendingMembers}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {openRequests.length > 0 && (
        <section className="mt-5" aria-label="Open requests">
          <h2 className="text-base font-bold text-ink">Neighbors are looking for…</h2>
          <div className="mt-2 flex flex-col gap-2">
            {openRequests.map((r) => {
              const cat = getCategory(r.category);
              return (
                <Link
                  key={r.id}
                  href={`/c/${community.code}/ask/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-coral-200 bg-coral-50 p-3 transition-colors hover:bg-coral-100"
                >
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="block text-sm text-soft">
                      {r.asked_by_name.split(' ')[0]} asked ·{' '}
                      {r.response_count} {r.response_count === 1 ? 'reply' : 'replies'}
                    </span>
                  </span>
                  <span className="shrink-0 text-base font-semibold text-coral-700">
                    Help →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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

      {askOpen && member && (
        <AskGroupModal
          community={{ name: community.name, code: community.code }}
          member={member}
          onClose={() => setAskOpen(false)}
        />
      )}

      {settingsOpen && member && (
        <SettingsPanel
          code={community.code}
          token={member.token}
          onClose={() => setSettingsOpen(false)}
          onChanged={() => refreshAdminState(member.token)}
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

      {voucherFilter && (
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-navy-100 px-3 py-1 text-sm font-semibold text-navy-700">
            {shortName(voucherFilter)}&apos;s vouches
          </span>
          <button
            onClick={() => setVoucherFilter(null)}
            className="text-sm text-soft hover:text-ink"
            aria-label="Clear voucher filter"
          >
            ✕ Clear
          </button>
        </div>
      )}

      <section className="mt-4 flex flex-col gap-3" aria-live="polite">
        {loading ? (
          <p className="py-10 text-center text-lg text-soft">Loading…</p>
        ) : (() => {
          const displayed = voucherFilter
            ? vendors.filter((v) => v.voucher_names.includes(voucherFilter))
            : vendors;
          return displayed.length > 0 ? (
            displayed.map((v) => (
              <VendorCard
                key={v.id}
                vendor={v}
                code={community.code}
                onVoucherClick={handleVoucherClick}
              />
            ))
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center shadow-card">
              <p className="text-4xl" aria-hidden="true">
                🌱
              </p>
              <h2 className="mt-3 text-xl font-bold text-ink">
                {q || category || voucherFilter ? 'No matches found' : 'No recommendations yet'}
              </h2>
              <p className="mt-2 text-base text-soft">
                {q || category || voucherFilter
                  ? 'Try a different search or category — or be the first to recommend someone!'
                  : 'Know a great plumber, sitter, or handyman? Be the first to vouch for them!'}
              </p>
            </div>
          );
        })()}
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
