'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StoredMember } from '@/types';
import { getStoredMember } from '@/lib/identity';
import { CATEGORIES } from '@/lib/categories';
import { StarPicker } from '@/components/Stars';
import JoinGate from '@/components/JoinGate';

export default function AddVendorClient({
  community,
}: {
  community: { name: string; code: string };
}) {
  const router = useRouter();
  const [member, setMember] = useState<StoredMember | null>(null);
  const [checkedIdentity, setCheckedIdentity] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMember(getStoredMember(community.code));
    setCheckedIdentity(true);
  }, [community.code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !member) return;
    if (!category) {
      setError('Please pick what kind of help they provide.');
      return;
    }
    if (rating < 1) {
      setError('Please tap a star rating — it helps your neighbors.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: community.code,
          token: member.token,
          name: name.trim(),
          category,
          phone: phone.trim(),
          contact: contact.trim(),
          rating,
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      router.push(`/c/${community.code}/v/${data.vendor.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-12 pt-6">
      <Link
        href={`/c/${community.code}`}
        className="inline-flex items-center gap-1 text-base font-semibold text-pine-600"
      >
        ← Back to {community.name}
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold text-ink">
        Recommend someone
      </h1>
      <p className="mt-1 text-lg text-soft">
        Vouch for a person or business you would happily hire again.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <div>
          <label htmlFor="vendor-name" className="block text-lg font-semibold text-ink">
            Who are you recommending?
          </label>
          <input
            id="vendor-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mike's Plumbing, or Sarah Lee"
            maxLength={80}
            required
            className="mt-1.5 w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500"
          />
        </div>

        <fieldset>
          <legend className="text-lg font-semibold text-ink">
            What kind of help do they provide?
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`rounded-2xl border-2 p-3 text-left text-base font-semibold transition-colors ${
                  category === c.id
                    ? 'border-pine-600 bg-pine-50 text-pine-800'
                    : 'border-transparent bg-white text-ink shadow-card'
                }`}
              >
                <span aria-hidden="true">{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="vendor-phone" className="block text-lg font-semibold text-ink">
            Phone number{' '}
            <span className="font-normal text-soft">(optional)</span>
          </label>
          <input
            id="vendor-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. (555) 123-4567"
            maxLength={30}
            autoComplete="off"
            className="mt-1.5 w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500"
          />
        </div>

        <div>
          <label htmlFor="vendor-contact" className="block text-lg font-semibold text-ink">
            Email or website{' '}
            <span className="font-normal text-soft">(optional)</span>
          </label>
          <input
            id="vendor-contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="e.g. mike@plumbing.com"
            maxLength={120}
            autoComplete="off"
            className="mt-1.5 w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500"
          />
        </div>

        <div>
          <p className="text-lg font-semibold text-ink">How would you rate them?</p>
          <div className="mt-2">
            <StarPicker value={rating} onChange={setRating} />
          </div>
        </div>

        <div>
          <label htmlFor="vendor-comment" className="block text-lg font-semibold text-ink">
            Tell your neighbors why{' '}
            <span className="font-normal text-soft">(optional)</span>
          </label>
          <textarea
            id="vendor-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Fixed our water heater the same day we called. Fair price, very kind."
            rows={4}
            maxLength={1000}
            className="mt-1.5 w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500"
          />
        </div>

        {error && (
          <p role="alert" className="text-base font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-pine-600 p-4 text-lg font-bold text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : '🤝 Add my vouch'}
        </button>
      </form>

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
