'use client';

import Link from 'next/link';
import type { VendorWithStats } from '@/types';
import { getCategory } from '@/lib/categories';
import { TagChips } from '@/components/Tags';

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

function VoucherLine({
  names,
  onVoucherClick,
}: {
  names: string[];
  onVoucherClick?: (fullName: string) => void;
}) {
  if (names.length === 0) return null;
  const shown = names.slice(0, 2);
  const overflow = names.length - 2;
  const sep = names.length === 2 ? ' & ' : ', ';
  return (
    <p className="mt-2 text-sm font-semibold text-navy-600">
      {'Vouched by '}
      {shown.map((name, i) => (
        <span key={name}>
          {i > 0 && sep}
          {onVoucherClick ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onVoucherClick(name);
              }}
              className="underline underline-offset-2 hover:text-navy-900"
            >
              {shortName(name)}
            </button>
          ) : (
            shortName(name)
          )}
        </span>
      ))}
      {overflow > 0 && ` + ${overflow} more`}
    </p>
  );
}

export default function VendorCard({
  vendor,
  code,
  onVoucherClick,
}: {
  vendor: VendorWithStats;
  code: string;
  onVoucherClick?: (fullName: string) => void;
}) {
  const category = getCategory(vendor.category);
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
          <VoucherLine names={vendor.voucher_names} onVoucherClick={onVoucherClick} />
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
