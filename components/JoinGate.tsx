'use client';

import { useEffect, useState } from 'react';
import type { MemberSuggestion, SignonMethod, StoredMember } from '@/types';
import { storeMember } from '@/lib/identity';

type Mode = 'loading' | 'join' | 'suggestions' | 'claimContact' | 'signin' | 'sent' | 'pending';

interface PublicConfig {
  signonMethod: SignonMethod;
  requirePhone: boolean;
  requireEmail: boolean;
}

/**
 * First-open gate for a community. Beyond "type your name," it checks whether
 * the typed name matches someone already in the directory (e.g. a seeded
 * member) and offers to claim that identity. Returning members can sign in from
 * any device via a magic link. The contact collected and the sign-in channel
 * follow the community's sign-on mechanism (phone via SMS, email via Resend, or
 * off = name only); a phone is also collected when the approved-phone list gates
 * the community, even under email sign-on.
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
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([]);
  const [claiming, setClaiming] = useState<MemberSuggestion | null>(null);
  const [claimContact, setClaimContact] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  // In local dev with no SMS/email provider, the API hands back the sign-in link
  // so we can show a tappable shortcut instead of forcing a trip to the logs.
  const [devLink, setDevLink] = useState('');

  // Load the community's sign-on config up front so we render the right fields.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/communities/${code}/public`, { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        if (res.ok) {
          setConfig({
            signonMethod: data.signonMethod,
            requirePhone: data.requirePhone,
            requireEmail: data.requireEmail,
          });
        } else {
          setConfig({ signonMethod: 'phone', requirePhone: false, requireEmail: false });
        }
        setMode('join');
      } catch {
        if (!alive) return;
        setConfig({ signonMethod: 'phone', requirePhone: false, requireEmail: false });
        setMode('join');
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  const channel: SignonMethod = config?.signonMethod ?? 'phone';
  const showPhone = !!config?.requirePhone;
  const showEmail = !!config?.requireEmail;
  const linkSignin = channel !== 'off'; // magic-link sign-in available?
  const claimByEmail = channel === 'email';
  // Copy that adapts to the sign-in channel.
  const channelNoun = claimByEmail ? 'email' : 'texts';
  const channelVerb = claimByEmail ? 'emailed' : 'texted';

  async function joinFresh() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/communities/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      // The sign-on contact already belonged to a member — link was sent.
      if (res.status === 409 && data.signin) {
        setSentMessage(data.message);
        setDevLink(data.devLink ?? '');
        setMode('sent');
        return;
      }
      if (!res.ok) {
        // Required-contact community: send the user back to the join step and
        // make sure the needed field is shown — covers a stale/failed config
        // fetch that would otherwise leave nowhere to type the contact.
        if (res.status === 400) {
          if (typeof data.error === 'string') {
            const msg = data.error.toLowerCase();
            if (msg.includes('email address')) {
              setConfig((c) => ({
                signonMethod: 'email',
                requirePhone: c?.requirePhone ?? false,
                requireEmail: true,
              }));
            }
            if (msg.includes('mobile number')) {
              setConfig((c) => ({
                signonMethod: c?.signonMethod ?? 'phone',
                requirePhone: true,
                requireEmail: c?.requireEmail ?? false,
              }));
            }
          }
          setMode('join');
        }
        throw new Error(data.error ?? 'Something went wrong.');
      }
      storeMember(code, { ...data.member, communityName });
      // Gated community: the member is pending until an organizer approves.
      if (data.status === 'pending') {
        setMode('pending');
        return;
      }
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
    // Off sign-on has no claim/sign-in path — go straight to a fresh join.
    if (!linkSignin) {
      await joinFresh();
      return;
    }
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

  // Chose a suggestion. With the sign-on contact on file we send a link; without
  // one, collect it to attach (seeded-member claim).
  async function chooseSuggestion(s: MemberSuggestion) {
    setError('');
    const hasContact = claimByEmail ? s.hasEmail : s.hasPhone;
    if (!hasContact) {
      setClaiming(s);
      setClaimContact(claimByEmail ? email.trim() : phone.trim());
      setMode('claimContact');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, memberId: s.id }),
      });
      const data = await res.json().catch(() => ({}));
      setSentMessage(
        `We ${channelVerb} ${s.name.split(' ')[0]}'s ${claimByEmail ? 'email' : 'number'} a sign-in link. Open it to finish.`
      );
      setDevLink(data.devLink ?? '');
      setMode('sent');
    } finally {
      setBusy(false);
    }
  }

  async function submitClaimContact(e: React.FormEvent) {
    e.preventDefault();
    if (!claiming || !claimContact.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/claim-by-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          claimByEmail
            ? { code, memberId: claiming.id, email: claimContact.trim() }
            : { code, memberId: claiming.id, phone: claimContact.trim() }
        ),
      });
      const data = await res.json();
      // Someone already claimed this identity — the server sent a link to the
      // contact on file; just tell the user to check for it.
      if (res.status === 409 && data.alreadyClaimed) {
        setSentMessage(
          `${claiming.name.split(' ')[0]} is already set up. We ${channelVerb} the ${claimByEmail ? 'email' : 'number'} on file a sign-in link.`
        );
        setDevLink(data.devLink ?? '');
        setMode('sent');
        return;
      }
      if (!res.ok || !data.member) throw new Error(data.error ?? 'Something went wrong.');
      // Signed in directly on this device.
      storeMember(code, { ...data.member, communityName });
      onJoined(data.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function submitSignin(e: React.FormEvent) {
    e.preventDefault();
    const value = claimByEmail ? email.trim() : phone.trim();
    if (!value || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimByEmail ? { code, email: value } : { code, phone: value }),
      });
      const data = await res.json().catch(() => ({}));
      setSentMessage(
        claimByEmail
          ? 'If that email is in this community, we just emailed a sign-in link. Check your inbox!'
          : 'If that number is in this community, we just texted a sign-in link. Check your texts!'
      );
      setDevLink(data.devLink ?? '');
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
        {mode === 'loading' && (
          <p className="py-10 text-center text-lg text-soft">One sec…</p>
        )}

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
              {showEmail && (
                <>
                  <label htmlFor="join-email" className="mt-4 block text-base font-semibold text-ink">
                    Email address <span className="font-normal text-soft">(required)</span>
                  </label>
                  <p className="mt-0.5 text-sm text-soft">
                    Lets you sign in on any device — we&apos;ll email you a link.
                  </p>
                  <input
                    id="join-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. pat@example.com"
                    autoComplete="email"
                    maxLength={120}
                    required
                    className={inputClass}
                  />
                </>
              )}
              {showPhone && (
                <>
                  <label htmlFor="join-phone" className="mt-4 block text-base font-semibold text-ink">
                    Mobile number <span className="font-normal text-soft">(required)</span>
                  </label>
                  <p className="mt-0.5 text-sm text-soft">
                    {channel === 'phone'
                      ? "Lets you sign in on any device — we'll text you a link."
                      : `${communityName} checks your number against its approved list.`}
                  </p>
                  <input
                    id="join-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. (555) 123-4567"
                    autoComplete="tel"
                    maxLength={30}
                    required
                    className={inputClass}
                  />
                </>
              )}
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
            {linkSignin && (
              <button
                onClick={() => { setError(''); setMode('signin'); }}
                className="mt-3 w-full rounded-2xl p-3 text-base font-semibold text-navy-600 hover:text-navy-800"
              >
                {claimByEmail ? 'Been here before? Sign in by email' : 'Been here before? Sign in by text'}
              </button>
            )}
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

        {mode === 'claimContact' && claiming && (
          <>
            <p className="text-4xl" aria-hidden="true">{claimByEmail ? '✉️' : '📱'}</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              Welcome back, {claiming.name.split(' ')[0]}!
            </h2>
            <p className="mt-1 text-lg text-soft">
              Add your {claimByEmail ? 'email' : 'mobile number'} to claim{' '}
              <span className="font-semibold text-ink">{claiming.name}</span> and
              pick up your recommendations. We&apos;ll use it to sign you in on
              other devices.
            </p>
            <form onSubmit={submitClaimContact} className="mt-5">
              <label htmlFor="claim-contact-in" className="block text-base font-semibold text-ink">
                Your {claimByEmail ? 'email address' : 'mobile number'}
              </label>
              <input
                id="claim-contact-in"
                type={claimByEmail ? 'email' : 'tel'}
                value={claimContact}
                onChange={(e) => setClaimContact(e.target.value)}
                placeholder={claimByEmail ? 'e.g. pat@example.com' : 'e.g. (555) 123-4567'}
                autoComplete={claimByEmail ? 'email' : 'tel'}
                maxLength={claimByEmail ? 120 : 30}
                required
                className={inputClass}
              />
              <button
                type="submit"
                disabled={busy || !claimContact.trim()}
                className="mt-4 w-full rounded-2xl bg-coral-600 p-4 text-lg font-bold text-white transition-colors hover:bg-coral-700 disabled:opacity-50"
              >
                {busy ? 'One sec…' : 'This is me — take me in'}
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
            <p className="text-4xl" aria-hidden="true">{claimByEmail ? '📧' : '📲'}</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              {claimByEmail ? 'Sign in by email' : 'Sign in by text'}
            </h2>
            <p className="mt-1 text-lg text-soft">
              Enter your {claimByEmail ? 'email address' : 'mobile number'} and we&apos;ll{' '}
              {claimByEmail ? 'email' : 'text'} you a link to sign in.
            </p>
            <form onSubmit={submitSignin} className="mt-5">
              <label htmlFor="signin-contact" className="block text-base font-semibold text-ink">
                Your {claimByEmail ? 'email address' : 'mobile number'}
              </label>
              <input
                id="signin-contact"
                type={claimByEmail ? 'email' : 'tel'}
                value={claimByEmail ? email : phone}
                onChange={(e) => (claimByEmail ? setEmail(e.target.value) : setPhone(e.target.value))}
                placeholder={claimByEmail ? 'e.g. pat@example.com' : 'e.g. (555) 123-4567'}
                autoComplete={claimByEmail ? 'email' : 'tel'}
                maxLength={claimByEmail ? 120 : 30}
                required
                className={inputClass}
              />
              <button
                type="submit"
                disabled={busy || !(claimByEmail ? email.trim() : phone.trim())}
                className="mt-4 w-full rounded-2xl bg-navy-600 p-4 text-lg font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
              >
                {busy ? 'Sending…' : claimByEmail ? 'Email me a sign-in link' : 'Text me a sign-in link'}
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
              Check your {channelNoun}!
            </h2>
            <p className="mt-2 text-lg text-soft">{sentMessage}</p>
            <p className="mt-3 text-base text-soft">
              The link opens this community signed in as you. You can close this
              window.
            </p>
            {devLink && (
              <a
                href={devLink}
                className="mt-4 block w-full rounded-2xl bg-navy-100 p-3 text-center text-base font-bold text-navy-800 transition-colors hover:bg-navy-200"
              >
                Dev mode: tap here to sign in
              </a>
            )}
          </>
        )}

        {mode === 'pending' && (
          <>
            <p className="text-4xl" aria-hidden="true">⏳</p>
            <h2 id="join-title" className="mt-2 text-2xl font-extrabold text-ink">
              You&apos;re on the list, {name.trim().split(' ')[0]}!
            </h2>
            <p className="mt-2 text-lg text-soft">
              {communityName} approves new members. An organizer will let you in
              shortly — check back soon.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
