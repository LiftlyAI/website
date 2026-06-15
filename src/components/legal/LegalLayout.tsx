import Link from 'next/link';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';

/**
 * Shared chrome + prose styling for the public legal pages (Privacy, Terms).
 * Lives outside the (app) auth group so it renders for logged-out visitors.
 */
export function LegalLayout({
  kicker,
  title,
  effectiveDate,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  effectiveDate: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-iron-950 text-chalk">
      {/* Nav */}
      <header className="border-b border-white/5 bg-iron-950/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="text-chalk transition-colors hover:text-blood-glow">
            <LiftlyLogo size={26} />
          </Link>
          <Link
            href="/"
            className="font-mono text-xs tracking-[0.15em] text-chalk-dim transition-colors hover:text-chalk"
          >
            ← BACK HOME
          </Link>
        </nav>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="mb-3 font-mono text-sm tracking-[0.35em] text-blood">{kicker}</p>
        <h1 className="stencil-heading text-4xl leading-[1.02] text-chalk md:text-6xl">{title}</h1>
        <div className="accent-divider mt-4 max-w-[120px]" />
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.2em] text-chalk-mute">
          Effective {effectiveDate}
        </p>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-chalk-dim">{intro}</p>

        <div className="legal-prose mt-12 space-y-10">{children}</div>

        <p className="mt-16 border-t border-iron-800 pt-8 text-sm leading-relaxed text-chalk-mute">
          Questions about this document? Email us at{' '}
          <a
            href="mailto:liftlysupport@gmail.com"
            className="text-blood underline-offset-4 hover:underline"
          >
            liftlysupport@gmail.com
          </a>
          .
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-iron-800 px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <Link href="/" className="text-chalk-dim transition-colors hover:text-chalk">
            <LiftlyLogo size={20} />
          </Link>
          <div className="flex items-center gap-6 font-mono text-xs tracking-[0.15em] text-chalk-mute">
            <Link href="/privacy" className="transition-colors hover:text-chalk">
              PRIVACY
            </Link>
            <Link href="/terms" className="transition-colors hover:text-chalk">
              TERMS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** A numbered top-level section. */
export function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="stencil-heading flex items-baseline gap-3 text-2xl text-chalk md:text-3xl">
        <span className="font-mono text-base text-blood">{n}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-chalk-dim">{children}</div>
    </section>
  );
}

/** Bulleted list with the house arrow marker. */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-1 shrink-0 text-blood">→</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
