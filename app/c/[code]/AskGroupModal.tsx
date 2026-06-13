'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoredMember, VendorWithStats } from '@/types';
import { CATEGORIES_BY_LABEL, getCategory } from '@/lib/categories';

// Create an "anyone know a …?" request. Shows existing matches first (the ask
// may already be answered), then posts the request and copies a WhatsApp-ready
// message before sending the asker to the request page.
export default function AskGroupModal({
  community,
  member,
  onClose,
}: {
  community: { name: string; code: string };
  member: StoredMember;
  onClose: () => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [matches, setMatches] = useState<VendorWithStats[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Preview who's already vouched for this category as soon as one is picked.
  useEffect(() => {
    if (!category) {
      setMatches(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/vendors?code=${community.code}&category=${category}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMatches(d.vendors ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [category, community.code]);

  async function post() {
    if (!category || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/communities/${community.code}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: member.token, category, note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');

      const label = getCategory(category).label;
      const link = `${window.location.origin}/c/${community.code}/ask/${data.request.id}`;
      const msg = `🤝 [${community.name}] ${member.name.split(' ')[0]} is looking for a ${label}. See who we vouch for or add someone you trust 👉 ${link}`;
      try {
        await navigator.clipboard.writeText(msg);
      } catch {
        // Clipboard may be unavailable; the request page still shows the link.
      }
      router.push(`/c/${community.code}/ask/${data.request.id}?copied=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask the group"
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-lift"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-ink">Ask the group</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-base font-semibold text-soft hover:text-ink">
            Close
          </button>
        </div>
        <p className="mt-1 text-base text-soft">
          What kind of pro are you looking for?
        </p>

        <div className="mt-4 flex-1 overflow-y-auto">
          <label htmlFor="ask-category" className="block text-base font-semibold text-ink">
            Category
          </label>
          <select
            id="ask-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink focus:border-navy-500"
          >
            <option value="">Pick one…</option>
            {CATEGORIES_BY_LABEL.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>

          <label htmlFor="ask-note" className="mt-4 block text-base font-semibold text-ink">
            Anything specific? <span className="font-normal text-soft">(optional)</span>
          </label>
          <textarea
            id="ask-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. flat roof, need it before winter"
            rows={2}
            maxLength={280}
            className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-navy-500"
          />

          {matches && matches.length > 0 && (
            <div className="mt-4 rounded-2xl bg-navy-50 p-4">
              <p className="text-base font-semibold text-navy-800">
                Good news — your neighbors already vouch for {matches.length}{' '}
                {matches.length === 1 ? 'option' : 'options'}:
              </p>
              <ul className="mt-2 list-disc pl-5 text-base text-ink">
                {matches.slice(0, 4).map((v) => (
                  <li key={v.id}>{v.name}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-soft">
                Still want fresh input? Post your request below.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-base font-medium text-coral-700">
            {error}
          </p>
        )}

        <button
          onClick={post}
          disabled={busy || !category}
          className="mt-4 w-full rounded-2xl bg-coral-600 p-4 text-lg font-bold text-white transition-colors hover:bg-coral-700 disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post & copy message for WhatsApp'}
        </button>
      </div>
    </div>
  );
}
