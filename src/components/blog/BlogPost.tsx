import Link from 'next/link';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';

// ── Page wrapper ────────────────────────────────────────────────────────────

interface BlogPostProps {
  title: string;
  date: string;
  readTime: string;
  category: string;
  children: React.ReactNode;
}

export function BlogPost({ title, date, readTime, category, children }: BlogPostProps) {
  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-iron-800 bg-iron-950/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-chalk transition-colors hover:text-blood-glow">
            <LiftlyLogo size={26} />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="hidden font-mono text-[11px] tracking-[0.15em] text-chalk-mute transition-colors hover:text-chalk sm:block"
            >
              ← ALL ARTICLES
            </Link>
            <Link href="/login" className="btn-primary !min-h-[36px] !px-4 !py-2 !text-xs">
              Start Lifting →
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-28">
        <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase">
          <span className="text-blood">{category}</span>
          <span className="text-iron-600">·</span>
          <time dateTime={date} className="text-chalk-mute">{date}</time>
          <span className="text-iron-600">·</span>
          <span className="text-chalk-mute">{readTime}</span>
        </div>

        <h1 className="stencil-heading mb-10 text-4xl leading-tight text-chalk md:text-[2.75rem]">
          {title}
        </h1>

        <article className="space-y-8">{children}</article>
      </main>

      <section className="border-t border-iron-800 bg-iron-900/40 py-16 text-center">
        <p className="page-kicker mb-3">// LIFTLY</p>
        <h2 className="stencil-heading mb-4 text-3xl text-chalk">
          Let the AI handle the programming.
        </h2>
        <p className="mx-auto mb-8 max-w-md font-body text-chalk-dim">
          Block periodization, RPE autoregulation, form check, and nutrition, all in one app.
        </p>
        <Link href="/login" className="btn-primary !px-8 !py-3.5">
          Start Lifting Free →
        </Link>
        <p className="mt-4 font-mono text-xs text-chalk-mute">
          Free to start. No push notifications. No fluff.
        </p>
      </section>
    </div>
  );
}

// ── Typography ──────────────────────────────────────────────────────────────

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="stencil-heading mt-10 border-b border-iron-800 pb-3 text-2xl text-chalk first:mt-0">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="stencil-heading mt-6 text-xl text-chalk">{children}</h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-[15px] leading-relaxed text-chalk-dim">{children}</p>
  );
}

// ── Content blocks ──────────────────────────────────────────────────────────

export function DefinitionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-r-lg border-l-2 border-blood bg-blood/5 px-5 py-4">
      <p className="font-body text-[15px] leading-relaxed text-chalk">{children}</p>
    </div>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="chalk-card border-l-2 border-blood/50 px-5 py-4">
      <p className="font-body text-sm leading-relaxed text-chalk-dim">{children}</p>
    </div>
  );
}

export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2.5 font-body text-[15px] text-chalk-dim">{children}</ul>;
}

export function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blood" />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

export function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-none space-y-3 font-body text-[15px] text-chalk-dim">{children}</ol>
  );
}

export function Oli({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="font-mono text-xs text-blood shrink-0 mt-1">0{num}</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

// ── Tables ──────────────────────────────────────────────────────────────────

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[460px] border-collapse font-body text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-iron-800 bg-iron-900 px-4 py-2.5 text-left font-mono text-[11px] tracking-[0.12em] uppercase text-chalk">
      {children}
    </th>
  );
}

export function Td({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <td
      className={`border border-iron-800 px-4 py-2.5 text-[13px] leading-snug ${
        highlight ? 'font-medium text-chalk' : 'text-chalk-dim'
      }`}
    >
      {children}
    </td>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

export function FAQSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-iron-800" />
        <span className="font-mono text-[11px] tracking-[0.25em] text-blood uppercase">
          Frequently asked questions
        </span>
        <span className="h-px flex-1 bg-iron-800" />
      </div>
      {children}
    </div>
  );
}

export function FAQItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chalk-card p-5">
      <h3 className="stencil-heading mb-2 text-base text-chalk">{question}</h3>
      <p className="font-body text-[14px] leading-relaxed text-chalk-dim">{children}</p>
    </div>
  );
}
