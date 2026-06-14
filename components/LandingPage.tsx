'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeMember } from '@/lib/identity';

type Mode = 'home' | 'create' | 'join';

export default function LandingPage({
  initialMode = 'home',
  initialCode = '',
  communityName: invitedTo,
}: {
  initialMode?: Mode;
  initialCode?: string;
  /** When arriving via a /join/CODE link for a known community, greet by name. */
  communityName?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [communityName, setCommunityName] = useState('');
  const [yourName, setYourName] = useState('');
  const [yourPhone, setYourPhone] = useState('');
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Some communities require a phone (admin approval / approved-list policies).
  // When the API tells us so, focus the phone field so the user can supply one
  // without changing pages.
  const [phoneRequired, setPhoneRequired] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  // When the server tells us the community is gated, focus the phone field
  // so the user can recover without scrolling around.
  useEffect(() => {
    if (phoneRequired) phoneInputRef.current?.focus();
  }, [phoneRequired]);

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
        body: JSON.stringify({
          name: yourName.trim(),
          phone: yourPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      // Phone already belonged to a member — server texted a sign-in link.
      if (res.status === 409 && data.signin) {
        setError(data.message ?? 'Check your texts for a sign-in link.');
        setBusy(false);
        return;
      }
      if (!res.ok) {
        // Phone-required communities: surface the phone field instead of dead-ending.
        if (
          res.status === 400 &&
          typeof data.error === 'string' &&
          data.error.toLowerCase().includes('mobile number')
        ) {
          setPhoneRequired(true);
        }
        throw new Error(data.error ?? 'Something went wrong.');
      }
      storeMember(code, data.member);
      // Gated communities may park the join in "pending" until an admin approves.
      // The community page handles the pending UI; just route there.
      router.push(`/c/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const inputClass =
    'mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-navy-500';
  const buttonClass =
    'mt-5 w-full rounded-2xl bg-navy-600 p-4 text-lg font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
      <header className="text-center">
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-coral-100 text-4xl"
          aria-hidden="true"
        >
          🤝
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-navy-800">
          Vouch
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-xl text-soft">
          Find a plumber, babysitter, or handyman —{' '}
          <span className="font-bold text-navy-800">
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
            className="rounded-3xl bg-navy-700 p-6 text-left shadow-card transition-colors hover:bg-navy-800"
          >
            <span className="block text-xl font-bold text-white">
              Start a community
            </span>
            <span className="mt-1 block text-base text-navy-200">
              For your neighborhood, family, church group, or friends.
            </span>
          </button>
          <button
            onClick={() => {
              setMode('join');
              setError('');
            }}
            className="rounded-3xl border-2 border-navy-200 bg-white p-6 text-left shadow-card transition-shadow hover:shadow-lift"
          >
            <span className="block text-xl font-bold text-navy-800">
              Join with a code
            </span>
            <span className="mt-1 block text-base text-soft">
              Someone shared an invite code with you? Enter it here.
            </span>
          </button>

          <section className="mt-8 rounded-3xl bg-navy-50 p-6">
            <h2 className="text-lg font-bold text-navy-800">How it works</h2>
            <ol className="mt-3 space-y-3 text-base text-ink">
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white"
                  aria-hidden="true"
                >
                  1
                </span>
                <span>Start a community and share the invite code.</span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white"
                  aria-hidden="true"
                >
                  2
                </span>
                <span>
                  Everyone adds the pros they trust — plumbers, sitters,
                  cleaners, mechanics.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white"
                  aria-hidden="true"
                >
                  3
                </span>
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
          <h2 className="text-2xl font-extrabold text-navy-800">Start a community</h2>
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
            <p role="alert" className="mt-3 text-base font-medium text-coral-700">
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
          <h2 className="text-2xl font-extrabold text-navy-800">
            {invitedTo ? `Join ${invitedTo}` : 'Join a community'}
          </h2>
          {invitedTo && (
            <p className="mt-1 text-lg text-soft">
              You&apos;ve been invited! Add your name to join.
            </p>
          )}
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
              autoFocus={!!invitedTo}
              className={inputClass}
            />
          </div>
          <div className="mt-4">
            <label htmlFor="join-your-phone" className="block text-base font-semibold text-ink">
              Mobile number{' '}
              <span className="font-normal text-soft">
                {phoneRequired ? '(required)' : '(recommended)'}
              </span>
            </label>
            <p className="mt-0.5 text-sm text-soft">
              {phoneRequired
                ? 'This community asks for your number to join.'
                : "Lets you sign in on any device — we'll text you a link."}
            </p>
            <input
              id="join-your-phone"
              ref={phoneInputRef}
              type="tel"
              value={yourPhone}
              onChange={(e) => setYourPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
              autoComplete="tel"
              maxLength={30}
              required={phoneRequired}
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-base font-medium text-coral-700">
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
