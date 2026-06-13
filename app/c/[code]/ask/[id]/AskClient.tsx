'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { RequestDetail, StoredMember, VendorWithStats } from '@/types';
import { getStoredMember } from '@/lib/identity';
import { getCategory } from '@/lib/categories';
import VendorCard from '@/components/VendorCard';
import JoinGate from '@/components/JoinGate';

export default function AskClient({
  community,
  requestId,
}: {
  community: { name: string; code: string };
  requestId: string;
}) {
  const [member, setMember] = useState<StoredMember | null>(null);
  const [checkedIdentity, setCheckedIdentity] = useState(false);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [matches, setMatches] = useState<VendorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setMember(getStoredMember(community.code));
    setCheckedIdentity(true);
    if (new URLSearchParams(window.location.search).get('copied') === '1') {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    }
  }, [community.code]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/requests/${requestId}?code=${community.code}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    if (res.ok) {
      setDetail(data.request);
      // Existing directory matches for the category that aren't already responses.
      const mRes = await fetch(
        `/api/vendors?code=${community.code}&category=${data.request.category}`,
        { cache: 'no-store' }
      );
      const mData = await mRes.json();
      const responseIds = new Set(data.request.responses.map((v: VendorWithStats) => v.id));
      setMatches((mData.vendors ?? []).filter((v: VendorWithStats) => !responseIds.has(v.id)));
    }
    setLoading(false);
  }, [requestId, community.code]);

  useEffect(() => {
    load();
  }, [load]);

  async function recommendExisting(vendorId: string) {
    if (!member || busyId) return;
    setBusyId(vendorId);
    try {
      await fetch(`/api/requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: community.code, token: member.token, vendorId }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function copyMessage() {
    if (!detail) return;
    const label = getCategory(detail.category).label;
    const link = `${window.location.origin}/c/${community.code}/ask/${requestId}`;
    const msg = `🤝 [${community.name}] ${detail.asked_by_name.split(' ')[0]} is looking for a ${label}. See who we vouch for or add someone you trust 👉 ${link}`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }
  }

  async function closeRequest() {
    if (!member || closing) return;
    setClosing(true);
    try {
      await fetch(`/api/requests/${requestId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: community.code, token: member.token }),
      });
      await load();
    } finally {
      setClosing(false);
    }
  }

  if (loading || !detail) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 pt-6">
        <p className="py-16 text-center text-lg text-soft">Loading…</p>
      </main>
    );
  }

  const category = getCategory(detail.category);
  const isAsker = member?.id === detail.asked_by;
  const closed = detail.status === 'closed';

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-12 pt-6">
      <Link
        href={`/c/${community.code}`}
        className="inline-flex items-center gap-1 text-base font-semibold text-navy-600"
      >
        ← Back to {community.name}
      </Link>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-100 text-3xl"
          aria-hidden="true"
        >
          {category.emoji}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">
          {detail.asked_by_name.split(' ')[0]} is looking for a {category.label}
        </h1>
        {detail.note && <p className="mt-2 text-lg text-soft">“{detail.note}”</p>}
        {closed ? (
          <p className="mt-3 inline-block rounded-full bg-navy-100 px-3 py-1 text-sm font-bold text-navy-800">
            ✅ Answered — request closed
          </p>
        ) : (
          <button
            onClick={copyMessage}
            className="mt-4 w-full rounded-2xl bg-navy-600 p-3 text-base font-bold text-white transition-colors hover:bg-navy-700"
          >
            {copied ? '✅ Message copied — paste it in WhatsApp' : '📋 Copy message for WhatsApp'}
          </button>
        )}
        {isAsker && !closed && (
          <button
            onClick={closeRequest}
            disabled={closing}
            className="mt-2 w-full rounded-2xl p-2 text-base font-semibold text-soft hover:text-ink disabled:opacity-50"
          >
            {closing ? 'Closing…' : 'Mark as answered'}
          </button>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-bold text-ink">
          {detail.responses.length > 0
            ? `${detail.responses.length} recommended`
            : 'No recommendations yet'}
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {detail.responses.map((v) => (
            <VendorCard key={v.id} vendor={v} code={community.code} />
          ))}
        </div>
      </section>

      {!closed && member && (
        <section className="mt-6">
          <Link
            href={`/c/${community.code}/add?request=${requestId}&category=${detail.category}`}
            className="block w-full rounded-2xl bg-coral-600 p-4 text-center text-lg font-bold text-white shadow-card transition-colors hover:bg-coral-700"
          >
            Recommend someone new
          </Link>

          {matches.length > 0 && (
            <div className="mt-4">
              <h3 className="text-base font-bold text-ink">
                Already in your directory
              </h3>
              <p className="text-sm text-soft">Tap to add one to this request.</p>
              <div className="mt-2 flex flex-col gap-2">
                {matches.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-card"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{v.name}</p>
                      <p className="text-sm text-soft">
                        {v.vouch_count} {v.vouch_count === 1 ? 'vouch' : 'vouches'}
                      </p>
                    </div>
                    <button
                      onClick={() => recommendExisting(v.id)}
                      disabled={busyId === v.id}
                      className="shrink-0 rounded-2xl bg-navy-100 px-4 py-2 text-base font-bold text-navy-800 transition-colors hover:bg-navy-200 disabled:opacity-50"
                    >
                      {busyId === v.id ? '…' : 'Recommend'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

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
