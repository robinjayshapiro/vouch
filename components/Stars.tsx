'use client';

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={filled ? 'text-honey-500' : 'text-pine-100'}
      fill="currentColor"
    >
      <path d="M12 2.5l2.95 5.98 6.6.96-4.77 4.65 1.12 6.57L12 17.56l-5.9 3.1 1.12-6.57-4.77-4.65 6.6-.96L12 2.5z" />
    </svg>
  );
}

export function Stars({
  rating,
  size = 20,
  showNumber = false,
}: {
  rating: number;
  size?: number;
  showNumber?: boolean;
}) {
  const rounded = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rounded} size={size} />
      ))}
      {showNumber && (
        <span className="ml-1.5 font-semibold text-ink" aria-hidden="true">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const labels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  return (
    <div>
      <div role="radiogroup" aria-label="Star rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''} — ${labels[n - 1]}`}
            onClick={() => onChange(n)}
            className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform active:scale-90"
          >
            <StarIcon filled={n <= value} size={34} />
          </button>
        ))}
      </div>
      <p className="mt-1 min-h-[1.5rem] text-base font-medium text-soft" aria-live="polite">
        {value > 0 ? labels[value - 1] : 'Tap a star to rate'}
      </p>
    </div>
  );
}
