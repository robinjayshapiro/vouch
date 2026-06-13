'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PendingVendorEdit, VendorEditChanges } from '@/types';
import { getCategory } from '@/lib/categories';

const FIELD_LABELS: Record<keyof VendorEditChanges, string> = {
  name: 'Name',
  category: 'Category',
  phone: 'Phone',
  contact: 'Email/website',
};

function displayValue(field: keyof VendorEditChanges, value: unknown): string {
  if (value == null || value === '') return '—';
  if (field === 'category') return getCategory(String(value)).label;
  return String(value);
}

// Admin-only modal listing pending vendor edits with a before/after diff and
// approve / reject actions.
export default function ModerationPanel({
  code,
  token,
  onClose,
  onReviewed,
}: {
  code: string;
  token: string;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [edits, setEdits] = useState<PendingVendorEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/communities/${code}/moderation?token=${token}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    if (res.ok) setEdits(data.edits);
    else setError(data.error ?? 'Could not load pending edits.');
    setLoading(false);
  }, [code, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, action: 'approve' | 'reject') {
    if (busyId) return;
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/moderation/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, token, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setEdits((prev) => prev.filter((e) => e.id !== id));
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review suggested edits"
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-lift"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-ink">Review changes</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-base font-semibold text-soft hover:text-ink"
          >
            Close
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-base font-medium text-coral-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center text-lg text-soft">Loading…</p>
          ) : edits.length === 0 ? (
            <div className="rounded-2xl bg-navy-50 p-6 text-center">
              <p className="text-3xl" aria-hidden="true">✅</p>
              <p className="mt-2 text-base font-semibold text-navy-800">
                Nothing to review — you&apos;re all caught up.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {edits.map((edit) => {
                const fields = Object.keys(edit.changes) as (keyof VendorEditChanges)[];
                return (
                  <article key={edit.id} className="rounded-2xl border-2 border-navy-100 p-4">
                    <p className="text-sm text-soft">
                      <span className="font-semibold text-ink">{edit.proposed_by_name}</span>{' '}
                      suggested an edit to
                    </p>
                    <p className="text-lg font-bold text-ink">{edit.current.name}</p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {fields.map((f) => (
                        <li key={f} className="text-base">
                          <span className="font-semibold text-ink">{FIELD_LABELS[f]}: </span>
                          <span className="text-soft line-through">
                            {displayValue(f, edit.current[f])}
                          </span>{' '}
                          <span aria-hidden="true">→</span>{' '}
                          <span className="font-semibold text-navy-800">
                            {displayValue(f, edit.changes[f])}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => review(edit.id, 'reject')}
                        disabled={busyId === edit.id}
                        className="flex-1 rounded-2xl bg-navy-50 p-3 text-base font-bold text-navy-800 transition-colors hover:bg-navy-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => review(edit.id, 'approve')}
                        disabled={busyId === edit.id}
                        className="flex-1 rounded-2xl bg-coral-600 p-3 text-base font-bold text-white transition-colors hover:bg-coral-700 disabled:opacity-50"
                      >
                        {busyId === edit.id ? 'Saving…' : 'Approve'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
