'use client';
import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// Display mode (no onChange) renders fractional fill via rating value; input
// mode (onChange supplied) is a 1-5 click/hover picker.
export function StarRating({
  value,
  onChange,
  size = 16,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const interactive = !!onChange;
  const shown = hover ?? value;

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role={interactive ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = shown >= i - 0.25;
        const star = (
          <Star
            width={size}
            height={size}
            className={cn(
              'transition-colors',
              filled ? 'fill-rpe-mod text-rpe-mod' : 'fill-transparent text-iron-600',
            )}
          />
        );
        if (!interactive) return <span key={i}>{star}</span>;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i === 1 ? '' : 's'}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange!(i)}
            className="cursor-pointer p-0.5 leading-none"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
