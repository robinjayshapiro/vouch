'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeMember } from '@/lib/identity';

type Mode = 'home' | 'create' | 'join';

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');
  const [communityName, setCommunityName] = useState('');
  const [yourName, setYourName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityName: communityName.trim(),
          yourName: yourName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      storeMember(data.community.code, data.member);
      router.push(`/c/${data.community.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const code = joinCode.trim().toUpperCase();
    try {
      const res = await fetch(`/api/communities/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: yourName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      storeMember(code, data.member);
      router.push(`/c/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const inputClass =
    'mt-1.5 w-full rounded-2xl border-2 border-pine-100 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-pine-500';
  const buttonClass =
    'mt-5 w-full rounded-2xl bg-pine-600 p-4 text-lg font-bold text-white transition-colors hover:bg-pine-700 disabled:opacity-50';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
      <header className="text-center">
        <p className="text-5xl" aria-hidden="true">
          🤝
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-pine-800">
          Vouch
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-xl text-soft">
          Find a plumber, babysitter, or handyman —{' '}
          <span className="font-semibold text-ink">
            recommended by people you actually know.
          </span>
        </p>
      </header>

      {mode === 'home' && (
        <div className="mt-10 flex flex-col gap-4">
          <button
            onClick={() => {
              setMode('create');
              setError('');
            }}
            className="rounded-3xl bg-pine-600 p-6 text-left shadow-card transition-colors hover:bg-pine-700"
          >
            <span className="block text-xl font-bold text-white">
              🏡 Start a community
            </span>
            <span className="mt-1 block text-base text-pine-100">
              For your neighborhood, family, church group, or friends.
            </span>
          </button>
          <button
            onClick={() => {
              setMode('join');
              setError('');
            }}
            className="rounded-3xl bg-white p-6 text-left shadow-card transition-shadow hover:shadow-lift"
          >
            <span className="block text-xl font-bold text-ink">
              🔑 Join with a code
            </span>
            <span className="mt-1 block text-base text-soft">
              Someone shared an invite code with you? Enter it here.
            </span>
          </button>

          <section className="mt-8 rounded-3xl bg-pine-50 p-6">
            <h2 className="text-lg font-bold text-pine-800">How it works</h2>
            <ol className="mt-3 space-y-3 text-base text-ink">
              <li className="flex gap-3">
                <span aria-hidden="true">1️⃣</span>
                <span>Start a community and share the invite code.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">2️⃣</span>
                <span>
                  Everyone adds the pros they trust — plumbers, sitters,
                  cleaners, mechanics.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">3️⃣</span>
                <span>
                  Next time you need help, you already know who your neighbors
                  vouch for.
                </span>
              </li>
            </ol>
          </section>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="mt-8 rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-2xl font-extrabold text-ink">Start a community</h2>
          <div className="mt-5">
            <label htmlFor="community-name" className="block text-base font-semibold text-ink">
              Community name
            </label>
            <input
              id="community-name"
              type="text"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="e.g. Maple Street Neighbors"
              maxLength={60}
              required
              className={inputClass}
            />
          </div>
          <div className="mt-4">
            <label htmlFor="create-your-name" className="block text-base font-semibold text-ink">
              Your name
            </label>
            <input
              id="create-your-name"
              type="text"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              placeholder="e.g. Pat Rivera"
              autoComplete="name"
              maxLength={40}
              required
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-base font-medium text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? 'Creating…' : 'Create my community'}
          </button>
          <button
            type="button"
            onClick={() => setMode('home')}
            className="mt-3 w-full rounded-2xl p-3 text-base font-semibold text-soft hover:text-ink"
          >
            ← Back
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="mt-8 rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-2xl font-extrabold text-ink">Join a community</h2>
          <div className="mt-5">
            <label htmlFor="join-code" className="block text-base font-semibold text-ink">
              Invite code
            </label>
            <input
              id="join-code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. QX7M2K"
              maxLength={6}
              required
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className={`${inputClass} text-center font-mono text-2xl tracking-[0.3em]`}
            />
          </div>
          <div className="mt-4">
            <label htmlFor="join-your-name" className="block text-base font-semibold text-ink">
              Your name
            </label>
            <input
              id="join-your-name"
              type="text"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              placeholder="e.g. Pat Rivera"
              autoComplete="name"
              maxLength={40}
              required
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-base font-medium text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? 'Joining…' : 'Join community'}
          </button>
          <button
            type="button"
            onClick={() => setMode('home')}
            className="mt-3 w-full rounded-2xl p-3 text-base font-semibold text-soft hover:text-ink"
          >
            ← Back
          </button>
        </form>
      )}

      <footer className="mt-auto pt-10 text-center text-sm text-soft">
        No passwords. No ads. Just people you trust.
      </footer>
    </main>
  );
}
