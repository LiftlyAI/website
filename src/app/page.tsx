import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Landing() {
  const session = await getSession();
  if (session) {
    redirect(session.hasProfile ? '/dashboard' : '/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-16 bg-iron-950">
        <div className="max-w-4xl w-full">
          <div className="font-mono text-xs text-blood tracking-[0.4em] mb-6">
            ──── AI POWERLIFTING COACH ────
          </div>
          <h1 className="stencil-heading text-7xl md:text-9xl text-chalk leading-none mb-6">
            IRON
            <br />
            <span className="text-blood">LEDGER</span>
          </h1>
          <p className="text-chalk-dim max-w-xl text-lg mb-10 font-body">
            Block periodization. Real form check from your phone. Macros that respect your sport.
            Built for lifters who measure their work in plates, not steps.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="btn-primary">
              Start Lifting →
            </Link>
            <a href="#how" className="btn-ghost">
              How it works
            </a>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Periodized Program', body: 'Hypertrophy → Strength → Peak. Adapted to your maxes, your schedule, your weak points.' },
              { num: '02', title: 'Form Check', body: 'Upload a clip. Get coach-quality cues — bar path, brace, knee tracking, lockout.' },
              { num: '03', title: 'Calibrated Nutrition', body: 'BMR, training-day cycling, protein per kg lean mass. No fluff.' },
            ].map((c) => (
              <div key={c.num} className="chalk-card p-5">
                <div className="font-mono text-blood text-sm mb-2">{c.num}</div>
                <div className="stencil-heading text-xl text-chalk mb-2">{c.title}</div>
                <div className="text-sm text-chalk-mute">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="how" className="border-t border-iron-800 px-6 py-8 text-xs font-mono text-chalk-mute flex flex-wrap gap-x-8 gap-y-2 justify-between">
        <span>NO FLUFF · NO PUSH NOTIFICATIONS · BUILT FOR THE PLATFORM</span>
        <span>Powered by Anthropic Claude</span>
      </footer>
    </div>
  );
}
