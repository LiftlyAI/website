import { ReactNode } from 'react';
import { ScrambleText } from '@/components/landing/ScrambleText';

/**
 * Standard page header: scramble-decoding `// KICKER`, big stencil title,
 * accent divider, optional sub copy and right-aligned actions. Matches the
 * landing page's section-header language.
 */
export function PageHeader({
  kicker,
  title,
  sub,
  right,
  className = 'mb-8',
}: {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      <p className="page-kicker mb-2">
        <ScrambleText text={`// ${kicker}`} />
      </p>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">{title}</h1>
        {right}
      </div>
      <div className="accent-divider mt-3 max-w-[120px]" />
      {sub && <p className="text-sm text-chalk-mute font-body mt-4 max-w-2xl">{sub}</p>}
    </header>
  );
}
