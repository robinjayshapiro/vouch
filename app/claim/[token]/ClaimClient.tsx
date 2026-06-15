'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { storeMember } from '@/lib/identity';

type Status = 'working' | 'expired' | 'ready';

export default function ClaimClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>('working');
  const [name, setName] = useState('');
  const [community, setCommunity] = useState<{ code: string; name: string } | null>(null);
  const [memberToken, setMemberToken] = useState('');
  const [needsPhone, setNeedsPhone] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);

  const [contact, setContact] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const ranOnce = useRef(false);

  const claim = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('expired');
        return;
      }
      // Restore identity on this device, then we're signed in.
      storeMember(data.community.code, data.member);
      setName(data.member.name);
      setMemberToken(data.member.token);
      setCommunity(data.community);
      setNeedsPhone(!!data.needsPhone);
      setNeedsEmail(!!data.needsEmail);
      setStatus('ready');
    } catch {
      setStatus('expired');
    }
  }, [token]);

  useEffect(() => {
    // Single-use tokens — guard against React strict-mode double invocation.
    if (ranOnce.current) return;
    ranOnce.current = true;
    claim();
  }, [claim]);

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (savingContact || !contact.trim() || !community) return;
    setSavingContact(true);
    try {
      await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          needsEmail
            ? { code: community.code, token: memberToken, email: contact.trim() }
            : { code: community.code, token: memberToken, phone: contact.trim() }
        ),
      });
      setContactSaved(true);
    } finally {
      setSavingContact(false);
    }
  }

  if (status === 'working') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5">
        <p className="text-lg text-soft">Signing you in…</p>
      </main>
    );
  }

  if (status === 'expired') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="text-5xl" aria-hidden="true">⏰</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">This link has expired</h1>
        <p className="mt-2 text-lg text-soft">
          Sign-in links work once and for a short time. Open your community and
          tap “Sign in by text” to get a fresh one.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-2xl bg-navy-600 px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-navy-700"
        >
          Go to Vouch
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <p className="text-4xl" aria-hidden="true">👋</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">
          Welcome back, {name.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-lg text-soft">
          You&apos;re signed in to {community?.name}. Your vouches are yours to
          edit on this device.
        </p>

        {(needsPhone || needsEmail) && !contactSaved && (
          <form onSubmit={saveContact} className="mt-5">
            <label htmlFor="claim-contact" className="block text-base font-semibold text-ink">
              Add your {needsEmail ? 'email' : 'mobile'} so you can sign in next time
            </label>
            <input
              id="claim-contact"
              type={needsEmail ? 'email' : 'tel'}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={needsEmail ? 'e.g. pat@example.com' : 'e.g. (555) 123-4567'}
              maxLength={needsEmail ? 120 : 30}
              autoComplete={needsEmail ? 'email' : 'tel'}
              className="mt-1.5 w-full rounded-2xl border-2 border-navy-200 bg-white p-4 text-lg text-ink placeholder:text-soft/60 focus:border-navy-500"
            />
            <button
              type="submit"
              disabled={savingContact || !contact.trim()}
              className="mt-3 w-full rounded-2xl bg-navy-100 p-3 text-base font-bold text-navy-800 transition-colors hover:bg-navy-200 disabled:opacity-50"
            >
              {savingContact ? 'Saving…' : needsEmail ? 'Save my email' : 'Save my number'}
            </button>
          </form>
        )}

        {contactSaved && (
          <p className="mt-4 rounded-2xl bg-navy-50 p-3 text-center text-base font-semibold text-navy-800">
            ✅ Saved — you can sign in {needsEmail ? 'by email' : 'by text'} from any device now.
          </p>
        )}

        <Link
          href={`/c/${community?.code}`}
          className="mt-5 block w-full rounded-2xl bg-coral-600 p-4 text-center text-lg font-bold text-white transition-colors hover:bg-coral-700"
        >
          Go to {community?.name} →
        </Link>
      </div>
    </main>
  );
}
