import { Metadata } from 'next';
import Link from 'next/link';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';

export const metadata: Metadata = {
  title: 'Powerlifting Guides & Training Resources',
  description:
    'Evidence-based guides on block periodization, RPE training, form check, and powerlifting nutrition from Liftly.',
  openGraph: {
    title: 'Powerlifting Guides & Training Resources',
    description:
      'Evidence-based guides on block periodization, RPE training, form check, and powerlifting nutrition from Liftly.',
    url: 'https://liftly.tech/blog',
  },
};

const ARTICLES = [
  {
    slug: 'block-periodization-powerlifting',
    category: 'PROGRAM DESIGN',
    title: 'What Is Block Periodization for Powerlifting?',
    description:
      'How the three-phase system (accumulation, intensification, realization) builds strength for meet day.',
    date: 'June 2026',
    readTime: '8 min',
  },
  {
    slug: 'rpe-powerlifting-guide',
    category: 'TRAINING METHODOLOGY',
    title: 'RPE in Powerlifting: The Complete Guide',
    description:
      'The full RPE scale, Tuchscherer percentages, calibration tips, and why autoregulation beats fixed loading.',
    date: 'June 2026',
    readTime: '6 min',
  },
  {
    slug: 'ai-powerlifting-coach-apps',
    category: 'GEAR & APPS',
    title: 'Best AI Powerlifting Coach Apps (2026)',
    description:
      'A sport-specific comparison of AI coaching apps for competitive powerlifters: programming, form check, and autoregulation.',
    date: 'June 2026',
    readTime: '5 min',
  },
  {
    slug: 'powerlifting-form-check',
    category: 'TECHNIQUE',
    title: 'Powerlifting Form Check: What Coaches Look For',
    description:
      'A lift-by-lift breakdown of squat, bench press, and deadlift: bar path, brace, knee tracking, and lockout.',
    date: 'June 2026',
    readTime: '7 min',
  },
  {
    slug: 'powerlifting-nutrition-guide',
    category: 'NUTRITION',
    title: 'Powerlifting Nutrition: How to Eat for Strength and a Meet',
    description:
      'Calorie targets, protein per kg LBM, training-day cycling, and the meet-week protocol, all grounded in the research.',
    date: 'June 2026',
    readTime: '7 min',
  },
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-iron-800 bg-iron-950/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-chalk transition-colors hover:text-blood-glow">
            <LiftlyLogo size={26} />
          </Link>
          <Link href="/login" className="btn-primary !min-h-[36px] !px-4 !py-2 !text-xs">
            Start Lifting →
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28">
        <div className="mb-12">
          <p className="page-kicker mb-2">// RESOURCES</p>
          <h1 className="stencil-heading text-4xl text-chalk md:text-5xl">Powerlifting Guides</h1>
          <p className="mt-4 max-w-xl font-body text-chalk-dim">
            Evidence-based training resources on programming, technique, and nutrition for serious
            lifters.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="chalk-card card-interactive block p-6"
            >
              <div className="mb-3 flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase">
                <span className="text-blood">{article.category}</span>
                <span className="text-iron-600">·</span>
                <span className="text-chalk-mute">{article.readTime}</span>
              </div>
              <h2 className="stencil-heading mb-2 text-xl leading-snug text-chalk">
                {article.title}
              </h2>
              <p className="font-body text-sm leading-relaxed text-chalk-dim">
                {article.description}
              </p>
              <div className="mt-4 font-mono text-[11px] tracking-[0.15em] text-blood">READ →</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
