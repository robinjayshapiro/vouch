'use client';

import Link from 'next/link';
import type { VendorWithStats } from '@/types';
import { getCategory } from '@/lib/categories';
import { Stars } from '@/components/Stars';

export default function VendorCard({
  vendor,
  code,
}: {
  vendor: VendorWithStats;
  code: string;
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
            {vendor.avg_rating != null ? (
              <>
                <Stars rating={vendor.avg_rating} size={18} />
                <span className="text-base text-soft">
                  {vendor.vouch_count}{' '}
                  {vendor.vouch_count === 1 ? 'vouch' : 'vouches'}
                </span>
              </>
            ) : (
              <span className="text-base text-soft">No vouches yet</span>
            )}
          </div>
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
