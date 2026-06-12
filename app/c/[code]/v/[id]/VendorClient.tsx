'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { StoredMember, Vendor } from '@/types';
import { getStoredMember } from '@/lib/identity';
import { getCategory } from '@/lib/categories';
import { Stars, StarPicker } from '@/components/Stars';
import JoinGate from '@/components/JoinGate';

interface VouchView {
  id: string;
  member_id: string;
  member_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  const date = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function VendorClient({
  community,
  vendorId,
}: {
  community: { name: string; code: string };
  vendorId: string;
}) {
  const [member, setMember] = useState<StoredMember | null>(null);
  const [checkedIdentity, setCheckedIdentity] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vouches, setVouches] = useState<VouchView[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMember(getStoredMember(community.code));
    setCheckedIdentity(true);
  }, [community.code]);

  const fetchVendor = useCallback(async () => {
    const res = await fetch(`/api/vendors/${vendorId}`);
    const data = await res.json();
    if (res.ok) {
      setVendor(data.vendor);
      setVouches(data.vouches);
      setAvgRating(data.avg_rating);
    }
    setLoading(false);
  }, [vendorId]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  const myVouch = member
    ? vouches.find((v) => v.member_id === member.id)
    : undefined;

  function openForm() {
    setRating(myVouch?.rating ?? 0);
    setComment(myVouch?.comment ?? '');
    setFormOpen(true);
    setSaved(false);
    setError('');
  }

  async function handleVouch(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !member) return;
    if (rating < 1) {
      setError('Please tap a star rating.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: community.code,
          token: member.token,
          vendorId,
          rating,
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setFormOpen(false);
      setSaved(true);
      await fetchVendor();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 pt-6">
        <p className="py-16 text-center text-lg text-soft">Loading…</p>
      </main>
    );
  }

  if (!vendor) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 pt-6">
        <p className="py-16 text-center text-lg text-soft">
          We couldn&apos;t find this recommendation.{' '}
          <Link href={`/c/${community.code}`} className="font-semibold text-pine-600 underline">
            Back to {community.name}
          </Link>
        </p>
      </main>
    );
  }

  const category = getCategory(vendor.category);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-12 pt-6">
      <Link
        href={`/c/${community.code}`}
        className="inline-flex items-center gap-1 text-base font-semibold text-pine-600"
      >
        ← Back to {community.name}
      </Link>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-3xl"
          aria-hidden="true"
        >
          {category.emoji}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-ink">{vendor.name}</h1>
        <p className="mt-1 text-lg text-soft">{category.label}</p>
        {avgRating != null && (
          <div className="mt-2 flex items-center gap-2">
            <Stars rating={avgRating} size={22} showNumber />
            <span className="text-base text-soft">
              · {vouches.length} {vouches.length === 1 ? 'vouch' : 'vouches'}
            </span>
          </div>
        )}
        {(vendor.phone || vendor.contact) && (
          <div className="mt-4 flex flex-col gap-2">
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone.replace(/[^+\d]/g, '')}`}
                className="block rounded-2xl bg-pine-600 p-4 text-center text-lg font-bold text-white transition-colors hover:bg-pine-700"
              >
                📞 Call {vendor.phone}
              </a>
            )}
            {vendor.contact && (
              <p className="break-words rounded-2xl bg-pine-50 p-4 text-center text-base font-semibold text-pine-800">
                ✉️ {vendor.contact}
              </p>
            )}
          </div>
        )}
      </section>

      {saved && (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-pine-100 p-4 text-center text-base font-semibold text-pine-800"
        >
          ✅ Thanks! Your vouch is saved.
        </p>
      )}

      {member && !formOpen && (
        <button
          onClick={openForm}
          className="mt-4 w-full rounded-2xl bg-honey-500 p-4 text-lg font-bold text-ink shadow-card transition-colors hover:bg-honey-600"
        >
          {myVouch ? '✏️ Update my vouch' : '🤝 Add my vouch'}
        </button>
      )}

      {formOpen && (
        <form
          onSubmit={handleVouch}
          className="mt-4 rounded-3xl bg-white p-6 shadow-card"
        >
          <h2 className="text-xl font-bold text-ink">
            {myVouch ? 'Update your vouch' : `Vouch for ${vendor.name}`}
          </h2>
          <div className="mt-3">
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <label htmlFor="vouch-comment" className="mt-3 block text-base font-semibold text-ink">
            What should your neighbors know?{' '}
            <span className="font-normal text-soft">(optional)</span>
          </label>
          <textarea
            id="vouch-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. On time, fair price, cleaned up after the job."
            rows={3}
            maxLength={1000}
            className="mt-1.5 w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500"
          />
          {error && (
            <p role="alert" className="mt-2 text-base font-medium text-red-700">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-2xl bg-pine-50 p-4 text-base font-bold text-pine-800 transition-colors hover:bg-pine-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-2xl bg-pine-600 p-4 text-base font-bold text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save my vouch'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-6" aria-label="Vouches from your community">
        <h2 className="text-xl font-bold text-ink">
          What your community says
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {vouches.map((v) => (
            <article key={v.id} className="rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-ink">
                  {v.member_name}
                  {member && v.member_id === member.id && (
                    <span className="ml-2 rounded-full bg-pine-100 px-2 py-0.5 text-sm font-semibold text-pine-800">
                      You
                    </span>
                  )}
                </p>
                <Stars rating={v.rating} size={16} />
              </div>
              {v.comment && (
                <p className="mt-2 text-base text-ink">{v.comment}</p>
              )}
              <p className="mt-2 text-sm text-soft">{formatDate(v.created_at)}</p>
            </article>
          ))}
        </div>
      </section>

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
