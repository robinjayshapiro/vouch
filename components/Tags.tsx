'use client';

import { TAGS, getTag } from '@/lib/tags';

// Read-only emoji+label chips for a vouch's tags or a vendor's aggregated top
// tags. Unknown ids are skipped; `max` caps how many render (the rest are
// summarized as "+N").
export function TagChips({
  tags,
  max,
  size = 'base',
}: {
  tags: string[];
  max?: number;
  size?: 'sm' | 'base';
}) {
  const known = tags.map(getTag).filter((t): t is NonNullable<typeof t> => !!t);
  if (known.length === 0) return null;
  const shown = max ? known.slice(0, max) : known;
  const extra = known.length - shown.length;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-sm' : 'px-2.5 py-1 text-base';
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((t) => (
        <span
          key={t.id}
          className={`inline-flex items-center gap-1 rounded-full bg-navy-50 font-medium text-navy-800 ${pad}`}
        >
          <span aria-hidden="true">{t.emoji}</span>
          {t.label}
        </span>
      ))}
      {extra > 0 && (
        <span className={`inline-flex items-center rounded-full bg-navy-50 font-medium text-soft ${pad}`}>
          +{extra}
        </span>
      )}
    </div>
  );
}

// Multi-select toggle chips over the full tag taxonomy. `value` is the set of
// selected tag ids; toggling adds/removes one.
export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  }
  return (
    <div role="group" aria-label="What stood out" className="flex flex-wrap gap-2">
      {TAGS.map((t) => {
        const selected = value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-base font-semibold transition-colors ${
              selected
                ? 'border-navy-600 bg-navy-50 text-navy-800'
                : 'border-navy-100 bg-white text-ink hover:bg-navy-50'
            }`}
          >
            <span aria-hidden="true">{t.emoji}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
