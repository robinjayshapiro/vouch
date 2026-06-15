'use client';

import Link from 'next/link';
import type { VendorWithStats } from '@/types';
import { getCategory } from '@/lib/categories';
import { TagChips } from '@/components/Tags';

// "Brett Rosenblatt" -> "Brett R."; single-word names pass through.
function shortName(full: string): string {
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

function vouchedByLine(names: string[]): string | null {
  if (names.length === 0) return null;
  const shown = names.slice(0, 2).map(shortName);
  if (names.length === 1) return `Vouched by ${shown[0]}`;
  if (names.length === 2) return `Vouched by ${shown[0]} & ${shown[1]}`;
  return `Vouched by ${shown[0]}, ${shown[1]} + ${names.length - 2} more`;
}

export default function VendorCard({
  vendor,
  code,
}: {
  vendor: VendorWithStats;
  code: string;
}) {
  const category = getCategory(vendor.category);
  const vouchedBy = vouchedByLine(vendor.voucher_names);
  return (
    <Link
      href={`/c/${code}/v/${vendor.id}`}
      className="block rounded-2xl bg-white p-4 shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-2xl"
          aria-hidden="true"
        >
          {category.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-ink">{vendor.name}</h3>
          <p className="text-base text-soft">{category.label}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-base text-soft">
              {vendor.vouch_count > 0
                ? `${vendor.vouch_count} ${vendor.vouch_count === 1 ? 'vouch' : 'vouches'}`
                : 'No vouches yet'}
            </span>
          </div>
          {vendor.top_tags.length > 0 && (
            <div className="mt-2">
              <TagChips tags={vendor.top_tags.map((t) => t.id)} max={3} size="sm" />
            </div>
          )}
          {vouchedBy && (
            <p className="mt-2 text-sm font-semibold text-navy-600">{vouchedBy}</p>
          )}
          {vendor.latest_comment && (
            <p className="mt-2 line-clamp-2 text-base italic text-soft">
              “{vendor.latest_comment}”
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
