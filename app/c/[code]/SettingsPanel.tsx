'use client';

import { useCallback, useEffect, useState } from 'react';
import type { JoinPolicy, PendingMember, SignonMethod } from '@/types';

const POLICY_OPTIONS: { value: JoinPolicy; label: string; help: string }[] = [
  { value: 'open', label: 'Open', help: 'Anyone with the invite link joins instantly.' },
  {
    value: 'admin_approval',
    label: 'Approve each member',
    help: 'New people wait for an organizer to approve them.',
  },
  {
    value: 'approved_list',
    label: 'Approved phone list',
    help: 'Numbers on your list get in instantly; everyone else waits for approval.',
  },
];

const SIGNON_OPTIONS: { value: SignonMethod; label: string; help: string }[] = [
  {
    value: 'phone',
    label: 'Phone (text)',
    help: 'Collect a mobile number; sign people back in with a texted link.',
  },
  {
    value: 'email',
    label: 'Email',
    help: 'Collect an email; sign people back in with an emailed link.',
  },
  {
    value: 'off',
    label: 'Off (name only)',
    help: 'Ask for just a name. No sign-in links — handy for quick, open groups.',
  },
];

export default function SettingsPanel({
  code,
  token,
  onClose,
  onChanged,
}: {
  code: string;
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [policy, setPolicy] = useState<JoinPolicy>('open');
  const [signon, setSignon] = useState<SignonMethod>('phone');
  const [allowed, setAllowed] = useState<{ id: string; phone: string }[]>([]);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [paste, setPaste] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/communities/${code}/settings?token=${token}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    if (res.ok) {
      setPolicy(data.joinPolicy);
      setSignon(data.signonMethod);
      setAllowed(data.allowedPhones);
      setPending(data.pendingMembers);
    }
    setLoading(false);
  }, [code, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function changePolicy(next: JoinPolicy) {
    setPolicy(next); // optimistic
    await fetch(`/api/communities/${code}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, joinPolicy: next }),
    });
    onChanged();
  }

  async function changeSignon(next: SignonMethod) {
    setSignon(next); // optimistic
    await fetch(`/api/communities/${code}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signonMethod: next }),
    });
    onChanged();
  }

  async function addPhones() {
    if (!paste.trim() || busy) return;
    setBusy(true);
    setNote('');
    try {
      const res = await fetch(`/api/communities/${code}/allowed-phones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phones: paste }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaste('');
        setNote(`Added ${data.added} number${data.added === 1 ? '' : 's'}.`);
        await load();
      } else {
        setNote(data.error ?? 'Could not add numbers.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function removePhone(id: string) {
    await fetch(`/api/communities/${code}/allowed-phones`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, id }),
    });
    setAllowed((prev) => prev.filter((p) => p.id !== id));
  }

  async function reviewMember(id: string, action: 'approve' | 'decline') {
    await fetch(`/api/communities/${code}/members/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });
    setPending((prev) => prev.filter((m) => m.id !== id));
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Community settings"
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-lift"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-ink">Settings</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-base font-semibold text-soft hover:text-ink">
            Close
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center text-lg text-soft">Loading…</p>
          ) : (
            <>
              {/* Pending approvals */}
              {pending.length > 0 && (
                <section className="rounded-2xl bg-coral-50 p-4">
                  <h3 className="text-base font-bold text-ink">
                    Waiting for approval ({pending.length})
                  </h3>
                  <div className="mt-2 flex flex-col gap-2">
                    {pending.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">{m.name}</p>
                          {m.phone && <p className="text-sm text-soft">{m.phone}</p>}
                          {m.email && <p className="truncate text-sm text-soft">{m.email}</p>}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => reviewMember(m.id, 'decline')}
                            className="rounded-xl bg-navy-50 px-3 py-2 text-sm font-bold text-navy-800 hover:bg-navy-100"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => reviewMember(m.id, 'approve')}
                            className="rounded-xl bg-coral-600 px-3 py-2 text-sm font-bold text-white hover:bg-coral-700"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Join policy */}
              <section className="mt-5">
                <h3 className="text-base font-bold text-ink">Who can join?</h3>
                <div className="mt-2 flex flex-col gap-2">
                  {POLICY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => changePolicy(o.value)}
                      aria-pressed={policy === o.value}
                      className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                        policy === o.value
                          ? 'border-navy-600 bg-navy-50'
                          : 'border-navy-100 bg-white hover:bg-navy-50'
                      }`}
                    >
                      <span className="block text-lg font-bold text-ink">
                        {policy === o.value ? '● ' : '○ '}
                        {o.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-soft">{o.help}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Sign-on mechanism — independent of the approval policy above. */}
              <section className="mt-6">
                <h3 className="text-base font-bold text-ink">How do members sign in?</h3>
                <p className="mt-0.5 text-sm text-soft">
                  Sets what newcomers enter and how returning members sign in on a new device.
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {SIGNON_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => changeSignon(o.value)}
                      aria-pressed={signon === o.value}
                      className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                        signon === o.value
                          ? 'border-navy-600 bg-navy-50'
                          : 'border-navy-100 bg-white hover:bg-navy-50'
                      }`}
                    >
                      <span className="block text-lg font-bold text-ink">
                        {signon === o.value ? '● ' : '○ '}
                        {o.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-soft">{o.help}</span>
                    </button>
                  ))}
                </div>
                {policy === 'approved_list' && signon === 'email' && (
                  <p className="mt-2 text-sm text-soft">
                    With the approved phone list on, members enter both a phone (checked
                    against the list) and an email (used for their sign-in link).
                  </p>
                )}
              </section>

              {/* Allowlist (relevant to approved_list, manageable anytime) */}
              {policy === 'approved_list' && (
                <section className="mt-5">
                  <h3 className="text-base font-bold text-ink">
                    Approved numbers ({allowed.length})
                  </h3>
                  <p className="mt-0.5 text-sm text-soft">
                    Paste numbers (one per line, or comma-separated).
                  </p>
                  <textarea
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    placeholder={'(516) 555-0142\n516-555-0199'}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border-2 border-navy-200 bg-white p-3 text-base text-ink placeholder:text-soft/60 focus:border-navy-500"
                  />
                  <button
                    onClick={addPhones}
                    disabled={busy || !paste.trim()}
                    className="mt-2 w-full rounded-2xl bg-navy-600 p-3 text-base font-bold text-white hover:bg-navy-700 disabled:opacity-50"
                  >
                    {busy ? 'Adding…' : 'Add to list'}
                  </button>
                  {note && <p className="mt-2 text-sm font-medium text-navy-700">{note}</p>}
                  <div className="mt-3 flex flex-col gap-1">
                    {allowed.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-navy-50 px-3 py-2">
                        <span className="text-base text-ink">{p.phone}</span>
                        <button
                          onClick={() => removePhone(p.id)}
                          className="text-sm font-semibold text-coral-700 hover:text-coral-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
