'use client';

import { useState } from 'react';
import type { StoredMember } from '@/types';
import { storeMember } from '@/lib/identity';

/**
 * Full-screen prompt shown the first time someone opens a community on this
 * device. One friendly question — their name — and they're in. No passwords.
 */
export default function JoinGate({
  code,
  communityName,
  onJoined,
}: {
  code: string;
  communityName: string;
  onJoined: (member: StoredMember) => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/communities/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      storeMember(code, data.member);
      onJoined(data.member);
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
        aria-labelledby="join-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift"
      >
        <p className="text-4xl" aria-hidden="true">
          👋
        </p>
        <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
          Welcome to {communityName}!
        </h2>
        <p className="mt-1 text-lg text-soft">
          Tell your neighbors who you are, so they know who to thank for your
          recommendations.
        </p>
        <form onSubmit={handleJoin} className="mt-5">
          <label htmlFor="join-name" className="block text-base font-semibold text-ink">
            Your name
          </label>
          <input
            id="join-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pat Rivera"
            autoComplete="name"
            maxLength={40}
            required
            className="mt-1.5 w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500"
          />
          {error && (
            <p role="alert" className="mt-2 text-base font-medium text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="mt-4 w-full rounded-2xl bg-pine-600 p-4 text-lg font-bold text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
          >
            {busy ? 'Joining…' : "Join the community"}
          </button>
        </form>
      </div>
    </div>
  );
}
