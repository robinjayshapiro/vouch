'use client';

import { useState } from 'react';
import type { MemberSuggestion, StoredMember } from '@/types';
import { storeMember } from '@/lib/identity';

type Mode = 'join' | 'suggestions' | 'claimPhone' | 'signin' | 'sent';

/**
 * First-open gate for a community. Beyond "type your name," it checks whether
 * the typed name matches someone already in the directory (e.g. a seeded
 * member) and offers to claim that identity by text — so people own the
 * vouches that were entered on their behalf. Returning members can sign in by
 * text from any device.
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
  const [mode, setMode] = useState<Mode>('join');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([]);
  const [claiming, setClaiming] = useState<MemberSuggestion | null>(null);
  const [claimPhone, setClaimPhone] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  async function joinFresh() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/communities/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });
      const data = await res.json();
      // Phone already belonged to a member — we texted them a sign-in link.
      if (res.status === 409 && data.signin) {
        setSentMessage(data.message);
        setMode('sent');
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      storeMember(code, data.member);
      onJoined(data.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/communities/${code}/members/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.suggestions?.length) {
        setSuggestions(data.suggestions);
        setMode('suggestions');
        setBusy(false);
        return;
      }
    } catch {
      // If the match check fails, fall through to a normal join.
    }
    await joinFresh();
  }

  // Chose a suggestion. With a phone on file we text that number; without one,
  // collect a mobile to attach (seeded-member claim).
  async function chooseSuggestion(s: MemberSuggestion) {
    setError('');
    if (!s.hasPhone) {
      setClaiming(s);
      setClaimPhone(phone.trim());
      setMode('claimPhone');
      return;
    }
    setBusy(true);
    try {
      await fetch('/api/auth/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, memberId: s.id }),
      });
      setSentMessage(`We texted ${s.name.split(' ')[0]}'s number a sign-in link. Tap it on your phone to finish.`);
      setMode('sent');
    } finally {
      setBusy(false);
    }
  }

  async function submitClaimPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!claiming || !claimPhone.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await fetch('/api/auth/claim-by-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, memberId: claiming.id, phone: claimPhone.trim() }),
      });
      setSentMessage(`We texted a sign-in link to confirm you're ${claiming.name.split(' ')[0]}. Tap it on your phone to finish.`);
      setMode('sent');
    } finally {
      setBusy(false);
    }
  }

  async function submitSignin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await fetch('/api/auth/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, phone: phone.trim() }),
      });
      setSentMessage('If that number is in this community, we just texted a sign-in link. Check your texts!');
      setMode('sent');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-navy-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift"
      >
        {mode === 'join' && (
          <>
            <p className="text-4xl" aria-hidden="true">👋</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              Welcome to {communityName}!
            </h2>
            <p className="mt-1 text-lg text-soft">
              Tell your neighbors who you are, so they know who to thank for your
              recommendations.
            </p>
            <form onSubmit={handleNameSubmit} className="mt-5">
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
                className={inputClass}
              />
              <label htmlFor="join-phone" className="mt-4 block text-base font-semibold text-ink">
                Mobile number{' '}
                <span className="font-normal text-soft">(recommended)</span>
              </label>
              <p className="mt-0.5 text-sm text-soft">
                Lets you sign in on any device — we&apos;ll text you a link.
              </p>
              <input
                id="join-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (555) 123-4567"
                autoComplete="tel"
                maxLength={30}
                className={inputClass}
              />
              {error && (
                <p role="alert" className="mt-2 text-base font-medium text-coral-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="mt-4 w-full rounded-2xl bg-navy-600 p-4 text-lg font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
              >
                {busy ? 'One sec…' : 'Join the community'}
              </button>
            </form>
            <button
              onClick={() => { setError(''); setMode('signin'); }}
              className="mt-3 w-full rounded-2xl p-3 text-base font-semibold text-navy-600 hover:text-navy-800"
            >
              Been here before? Sign in by text
            </button>
          </>
        )}

        {mode === 'suggestions' && (
          <>
            <p className="text-4xl" aria-hidden="true">🤔</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              Looks like you might already be here
            </h2>
            <p className="mt-1 text-lg text-soft">
              Someone already added recommendations under this name. Is this you?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => chooseSuggestion(s)}
                  disabled={busy}
                  className="flex items-center justify-between rounded-2xl border-2 border-navy-200 bg-white p-4 text-left transition-colors hover:bg-navy-50 disabled:opacity-50"
                >
                  <span>
                    <span className="block text-lg font-bold text-ink">{s.name}</span>
                    <span className="block text-sm text-soft">
                      {s.vouchCount} {s.vouchCount === 1 ? 'vouch' : 'vouches'}
                    </span>
                  </span>
                  <span className="text-base font-semibold text-navy-600">That&apos;s me →</span>
                </button>
              ))}
            </div>
            <button
              onClick={joinFresh}
              disabled={busy}
              className="mt-4 w-full rounded-2xl bg-navy-600 p-4 text-base font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
            >
              {busy ? 'One sec…' : `No, I'm new — join as ${name.trim()}`}
            </button>
            {error && (
              <p role="alert" className="mt-3 text-base font-medium text-coral-700">
                {error}
              </p>
            )}
          </>
        )}

        {mode === 'claimPhone' && claiming && (
          <>
            <p className="text-4xl" aria-hidden="true">📱</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              Let&apos;s confirm it&apos;s you
            </h2>
            <p className="mt-1 text-lg text-soft">
              Add your mobile number and we&apos;ll text a link to finish claiming{' '}
              <span className="font-semibold text-ink">{claiming.name}</span>.
            </p>
            <form onSubmit={submitClaimPhone} className="mt-5">
              <label htmlFor="claim-phone-in" className="block text-base font-semibold text-ink">
                Your mobile number
              </label>
              <input
                id="claim-phone-in"
                type="tel"
                value={claimPhone}
                onChange={(e) => setClaimPhone(e.target.value)}
                placeholder="e.g. (555) 123-4567"
                autoComplete="tel"
                maxLength={30}
                required
                className={inputClass}
              />
              <button
                type="submit"
                disabled={busy || !claimPhone.trim()}
                className="mt-4 w-full rounded-2xl bg-coral-600 p-4 text-lg font-bold text-white transition-colors hover:bg-coral-700 disabled:opacity-50"
              >
                {busy ? 'Texting…' : 'Text me the link'}
              </button>
            </form>
            <button
              onClick={() => { setError(''); setMode('suggestions'); }}
              className="mt-3 w-full rounded-2xl p-3 text-base font-semibold text-soft hover:text-ink"
            >
              ← Back
            </button>
          </>
        )}

        {mode === 'signin' && (
          <>
            <p className="text-4xl" aria-hidden="true">📲</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              Sign in by text
            </h2>
            <p className="mt-1 text-lg text-soft">
              Enter your mobile number and we&apos;ll text you a link to sign in.
            </p>
            <form onSubmit={submitSignin} className="mt-5">
              <label htmlFor="signin-phone" className="block text-base font-semibold text-ink">
                Your mobile number
              </label>
              <input
                id="signin-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (555) 123-4567"
                autoComplete="tel"
                maxLength={30}
                required
                className={inputClass}
              />
              <button
                type="submit"
                disabled={busy || !phone.trim()}
                className="mt-4 w-full rounded-2xl bg-navy-600 p-4 text-lg font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
              >
                {busy ? 'Texting…' : 'Text me a sign-in link'}
              </button>
            </form>
            <button
              onClick={() => { setError(''); setMode('join'); }}
              className="mt-3 w-full rounded-2xl p-3 text-base font-semibold text-soft hover:text-ink"
            >
              ← Back to join
            </button>
          </>
        )}

        {mode === 'sent' && (
          <>
            <p className="text-4xl" aria-hidden="true">✉️</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              Check your texts!
            </h2>
            <p className="mt-2 text-lg text-soft">{sentMessage}</p>
            <p className="mt-3 text-base text-soft">
              The link opens this community signed in as you. You can close this
              window.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
