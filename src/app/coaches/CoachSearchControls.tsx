'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { SPECIALTIES, FEDERATIONS, PRICE_BUCKETS } from '@/lib/network-constants';
import { cn } from '@/lib/utils';

const SELECTS: { key: string; label: string; options: { value: string; label: string }[] }[] = [
  {
    key: 'specialty',
    label: 'Specialty',
    options: [{ value: '', label: 'Any specialty' }, ...SPECIALTIES.map((s) => ({ value: s.slug, label: s.label }))],
  },
  {
    key: 'federation',
    label: 'Federation',
    options: [{ value: '', label: 'Any federation' }, ...FEDERATIONS.map((f) => ({ value: f, label: f }))],
  },
  {
    key: 'experience',
    label: 'Experience',
    options: [
      { value: '', label: 'Any experience' },
      { value: 'novice', label: '1-3 years' },
      { value: 'intermediate', label: '3-7 years' },
      { value: 'advanced', label: '7+ years' },
    ],
  },
  {
    key: 'delivery',
    label: 'Format',
    options: [
      { value: '', label: 'Any format' },
      { value: 'online', label: 'Online' },
      { value: 'in-person', label: 'In-person' },
    ],
  },
  {
    key: 'availability',
    label: 'Availability',
    options: [
      { value: '', label: 'Any availability' },
      { value: 'accepting', label: 'Accepting clients' },
      { value: 'waitlist', label: 'Waitlist' },
    ],
  },
  {
    key: 'price',
    label: 'Price',
    options: [{ value: '', label: 'Any price' }, ...PRICE_BUCKETS.map((b) => ({ value: b.value, label: b.label }))],
  },
  {
    key: 'verified',
    label: 'Verified',
    options: [
      { value: '', label: 'All coaches' },
      { value: '1', label: 'Verified only' },
    ],
  },
  {
    key: 'sort',
    label: 'Sort',
    options: [
      { value: 'top-rated', label: 'Top rated' },
      { value: 'rising', label: 'Rising' },
      { value: 'recent', label: 'Recent' },
    ],
  },
];

export function CoachSearchControls() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`/coaches?${sp.toString()}`);
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chalk-mute" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Try "USAPL nationals coach" or "first meet"'
          className={cn('input-iron pl-10')}
          aria-label="Search coaches"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        {SELECTS.map((s) => (
          <select
            key={s.key}
            aria-label={s.label}
            value={params.get(s.key) ?? ''}
            onChange={(e) => apply({ [s.key]: e.target.value })}
            className="input-iron w-auto cursor-pointer appearance-none py-2 text-xs"
          >
            {s.options.map((o) => (
              <option key={o.value} value={o.value} className="bg-iron-900 text-chalk">
                {o.label}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
