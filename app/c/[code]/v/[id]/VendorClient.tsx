'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { StoredMember, Vendor } from '@/types';
import { getStoredMember } from '@/lib/identity';
import { getCategory, CATEGORIES_BY_LABEL } from '@/lib/categories';
import { TagChips, TagPicker } from '@/components/Tags';
import JoinGate from '@/components/JoinGate';
import type { VendorEditChanges } from '@/types';

interface VouchView {
  id: string;
  member_id: string;
  member_name: string;
  tags: string[];
  comment: string | null;
  created_at: string;
}

// Aggregate tag usage across a vendor's vouches, most-used first.
function topTags(vouches: VouchView[]): string[] {
  const counts = new Map<string, number>();
  for (const v of vouches) {
    for (const id of v.tags) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([id]) => id);
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
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Suggest-an-edit form
  const [editOpen, setEditOpen] = useState(false);
  const [eName, setEName] = useState('');
  const [eCategory, setECategory] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eContact, setEContact] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editResult, setEditResult] = useState<'applied' | 'pending' | null>(null);

  useEffect(() => {
    setMember(getStoredMember(community.code));
    setCheckedIdentity(true);
  }, [community.code]);

  const fetchVendor = useCallback(async () => {
    const res = await fetch(`/api/vendors/${vendorId}`, { cache: 'no-store' });
    const data = await res.json();
    if (res.ok) {
      setVendor(data.vendor);
      setVouches(data.vouches);
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
    setTags(myVouch?.tags ?? []);
    setComment(myVouch?.comment ?? '');
    setFormOpen(true);
    setSaved(false);
    setError('');
  }

  async function handleVouch(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !member) return;
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
          tags,
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

  function openEdit() {
    if (!vendor) return;
    setEName(vendor.name);
    setECategory(vendor.category);
    setEPhone(vendor.phone ?? '');
    setEContact(vendor.contact ?? '');
    setEditError('');
    setEditResult(null);
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editBusy || !member || !vendor) return;

    // Send only fields that actually changed, so the review diff is meaningful.
    const changes: VendorEditChanges = {};
    if (eName.trim() && eName.trim() !== vendor.name) changes.name = eName.trim();
    if (eCategory && eCategory !== vendor.category) changes.category = eCategory;
    if (ePhone.trim() !== (vendor.phone ?? '')) changes.phone = ePhone.trim() || null;
    if (eContact.trim() !== (vendor.contact ?? '')) changes.contact = eContact.trim() || null;
    if (Object.keys(changes).length === 0) {
      setEditError('Nothing changed yet.');
      return;
    }

    setEditBusy(true);
    setEditError('');
    try {
      const res = await fetch(`/api/vendors/${vendorId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: community.code, token: member.token, changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setEditOpen(false);
      setEditResult(data.applied ? 'applied' : 'pending');
      if (data.applied) await fetchVendor();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setEditBusy(false);
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
          <Link href={`/c/${community.code}`} className="font-semibold text-navy-600 underline">
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
        className="inline-flex items-center gap-1 text-base font-semibold text-navy-600"
      >
        ← Back to {community.name}
      </Link>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-3xl"
          aria-hidden="true"
        >
          {category.emoji}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-ink">{vendor.name}</h1>
        <p className="mt-1 text-lg text-soft">{category.label}</p>
        {vouches.length > 0 && (
          <>
            <p className="mt-2 text-base font-semibold text-soft">
              {vouches.length} {vouches.length === 1 ? 'vouch' : 'vouches'}
            </p>
            {topTags(vouches).length > 0 && (
              <div className="mt-2">
                <TagChips tags={topTags(vouches)} size="sm" />
              </div>
            )}
          </>
        )}
        {(vendor.phone || vendor.contact) && (
          <div className="mt-4 flex flex-col gap-2">
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone.replace(/[^+\d]/g, '')}`}
                className="block rounded-2xl bg-navy-600 p-4 text-center text-lg font-bold text-white transition-colors hover:bg-navy-700"
              >
                📞 Call {vendor.phone}
              </a>
            )}
            {vendor.contact && (
              <p className="break-words rounded-2xl bg-navy-50 p-4 text-center text-base font-semibold text-navy-800">
                ✉️ {vendor.contact}
              </p>
            )}
          </div>
        )}
      </section>

      {member && !editOpen && (
        <button
          onClick={openEdit}
          className="mt-2 text-base font-semibold text-navy-600 hover:text-navy-800"
        >
          ✏️ Suggest an edit
        </button>
      )}

      {editResult === 'applied' && (
        <p role="status" className="mt-3 rounded-2xl bg-navy-100 p-4 text-center text-base font-semibold text-navy-800">
          ✅ Details updated.
        </p>
      )}
      {editResult === 'pending' && (
        <p role="status" className="mt-3 rounded-2xl bg-navy-50 p-4 text-center text-base font-semibold text-navy-800">
          ✅ Thanks! Your suggested edit was sent to an organizer for review.
        </p>
      )}

      {editOpen && (
        <form onSubmit={handleEdit} className="mt-3 rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold text-ink">Edit details</h2>
          <p className="mt-1 text-base text-soft">
            Fix a name, number, or category. Organizers review changes to shared
            listings.
          </p>
          <label htmlFor="edit-name" className="mt-4 block text-base font-semibold text-ink">
            Name
          </label>
          <input
            id="edit-name"
            type="text"
            value={eName}
            onChange={(e) => setEName(e.target.value)}
            maxLength={80}
            className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink focus:border-navy-500"
          />
          <label htmlFor="edit-category" className="mt-3 block text-base font-semibold text-ink">
            Category
          </label>
          <select
            id="edit-category"
            value={eCategory}
            onChange={(e) => setECategory(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink focus:border-navy-500"
          >
            {CATEGORIES_BY_LABEL.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <label htmlFor="edit-phone" className="mt-3 block text-base font-semibold text-ink">
            Phone <span className="font-normal text-soft">(optional)</span>
          </label>
          <input
            id="edit-phone"
            type="tel"
            value={ePhone}
            onChange={(e) => setEPhone(e.target.value)}
            maxLength={30}
            className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink focus:border-navy-500"
          />
          <label htmlFor="edit-contact" className="mt-3 block text-base font-semibold text-ink">
            Email or website <span className="font-normal text-soft">(optional)</span>
          </label>
          <input
            id="edit-contact"
            type="text"
            value={eContact}
            onChange={(e) => setEContact(e.target.value)}
            maxLength={120}
            className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink focus:border-navy-500"
          />
          {editError && (
            <p role="alert" className="mt-2 text-base font-medium text-coral-700">
              {editError}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 rounded-2xl bg-navy-50 p-4 text-base font-bold text-navy-800 transition-colors hover:bg-navy-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editBusy}
              className="flex-1 rounded-2xl bg-navy-600 p-4 text-base font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
            >
              {editBusy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {saved && (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-navy-100 p-4 text-center text-base font-semibold text-navy-800"
        >
          ✅ Thanks! Your vouch is saved.
        </p>
      )}

      {member && !formOpen && (
        <button
          onClick={openForm}
          className="mt-4 w-full rounded-2xl bg-coral-600 p-4 text-lg font-bold text-white shadow-card transition-colors hover:bg-coral-700"
        >
          {myVouch ? 'Update my vouch' : 'Add my vouch'}
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
          <p className="mt-3 text-base font-semibold text-ink">
            What stood out? <span className="font-normal text-soft">(optional)</span>
          </p>
          <div className="mt-2">
            <TagPicker value={tags} onChange={setTags} />
          </div>
          <label htmlFor="vouch-comment" className="mt-4 block text-base font-semibold text-ink">
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
            className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-navy-500"
          />
          {error && (
            <p role="alert" className="mt-2 text-base font-medium text-coral-700">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-2xl bg-navy-50 p-4 text-base font-bold text-navy-800 transition-colors hover:bg-navy-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-2xl bg-coral-600 p-4 text-base font-bold text-white transition-colors hover:bg-coral-700 disabled:opacity-50"
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
              <p className="font-bold text-ink">
                {v.member_name}
                {member && v.member_id === member.id && (
                  <span className="ml-2 rounded-full bg-coral-100 px-2 py-0.5 text-sm font-semibold text-coral-800">
                    You
                  </span>
                )}
              </p>
              {v.tags.length > 0 && (
                <div className="mt-2">
                  <TagChips tags={v.tags} size="sm" />
                </div>
              )}
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
