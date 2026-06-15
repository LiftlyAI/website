'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';
import { Magnetic } from './Magnetic';
import { ScrambleText } from './ScrambleText';
import { TiltCard } from './TiltCard';

const HeroScene = dynamic(
  () => import('./HeroScene').then((m) => m.HeroScene),
  { ssr: false }
);

gsap.registerPlugin(ScrollTrigger);

const HEADLINE = 'STRENGTH, ENGINEERED.';

const FEATURES = [
  {
    num: '01',
    title: 'Periodized Program',
    body: 'Hypertrophy → Strength → Peak. Block periodization tuned to your maxes, your schedule, your weak points. It recalculates every time you log a set.',
    tag: 'PROGRAM ENGINE',
    points: ['1RM-driven loading', 'RPE autoregulation', 'Weak-point targeting'],
  },
  {
    num: '02',
    title: 'Form Check',
    body: 'Film a set on your phone. Get frame-aware cues on bar path, brace, knee tracking, and lockout, the way a coach reads you from the side.',
    tag: 'VIDEO ANALYSIS',
    points: ['Bar path tracking', 'Brace & setup cues', 'Lockout diagnostics'],
  },
  {
    num: '03',
    title: 'Calibrated Nutrition',
    body: 'BMR-based targets, training-day calorie cycling, protein per kilogram of lean mass. Numbers built for the platform, not the beach.',
    tag: 'FUEL PROTOCOL',
    points: ['Training-day cycling', 'Protein per kg LBM', 'Meet-week strategy'],
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Tell it how you lift',
    body: 'Your maxes, your schedule, your federation, your weak points. Ninety seconds of onboarding, zero filler questions.',
  },
  {
    num: '02',
    title: 'Get your block',
    body: 'A periodized program lands the moment you finish onboarding. Every set, every percentage, every rest day accounted for.',
  },
  {
    num: '03',
    title: 'Log and adapt',
    body: 'Rate your sets with RPE. The program reads your readiness and adjusts load before fatigue becomes a missed lift.',
  },
  {
    num: '04',
    title: 'Peak on the platform',
    body: 'Taper timed to meet day. Openers picked from data, not vibes. Show up strong, go nine for nine.',
  },
];

const STATS = [
  { value: 3, suffix: '', label: 'lifts that matter' },
  { value: 100, suffix: '%', label: 'tailored to your numbers' },
  { value: 10, suffix: '', label: 'RPE-capped autoregulation' },
  { value: 0, suffix: '', label: 'fluff, ever' },
];

const MARQUEE_WORDS = [
  'SQUAT', 'BENCH', 'DEADLIFT', 'RPE', 'BAR PATH', 'BRACE',
  'BLOCKS', 'OPENERS', 'CHALK UP', 'PR DAY',
];

export function LandingExperience({ dashboardHref }: { dashboardHref?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  // When a logged-in lifter views the marketing page, every "Start Lifting" CTA
  // takes them into the app instead of bouncing through /login.
  const startHref = dashboardHref ?? '/login';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    let lenis: Lenis | null = null;

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // ---- Buttery smooth scrolling, synced to GSAP's ticker --------------
      lenis = new Lenis({ duration: 1.1 });
      lenis.on('scroll', ScrollTrigger.update);
      const tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // ---- Cursor glow (desktop pointers only) -----------------------------
      const cursor = cursorRef.current;
      let cursorCleanup: (() => void) | undefined;
      if (cursor && window.matchMedia('(hover: hover)').matches) {
        const cx = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3.out' });
        const cy = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3.out' });
        const onMove = (e: MouseEvent) => {
          cursor.style.opacity = '1';
          cx(e.clientX);
          cy(e.clientY);
        };
        window.addEventListener('mousemove', onMove, { passive: true });
        cursorCleanup = () => window.removeEventListener('mousemove', onMove);
      }

      const ctx = gsap.context(() => {
        // ---- Hero entrance -------------------------------------------------
        const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
        intro
          .from('.hero-kicker', { y: 24, autoAlpha: 0, duration: 0.7, delay: 0.15 })
          .from(
            '.hero-char',
            { yPercent: 120, duration: 0.9, stagger: 0.028 },
            '-=0.35'
          )
          .from('.hero-sub', { y: 28, autoAlpha: 0, duration: 0.7 }, '-=0.5')
          .from('.hero-cta', { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, '-=0.45')
          .from('.hero-scroll-hint', { autoAlpha: 0, duration: 0.8 }, '-=0.2')
          .from('.hero-canvas', { autoAlpha: 0, duration: 1.4, ease: 'power2.inOut' }, 0.2);

        // ---- Nav: hide on scroll down, return on scroll up -------------------
        const nav = root.querySelector('.landing-nav');
        if (nav) {
          ScrollTrigger.create({
            start: 'top top',
            end: 'max',
            onUpdate: (self) => {
              gsap.to(nav, {
                yPercent: self.direction === 1 && self.scroll() > 140 ? -110 : 0,
                duration: 0.35,
                ease: 'power3.out',
                overwrite: 'auto',
              });
            },
          });
        }

        // ---- Hero content parallax out -------------------------------------
        gsap.to('.hero-copy', {
          yPercent: -18,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom 35%',
            scrub: true,
          },
        });

        // ---- Pinned feature panels (desktop only) ---------------------------
        mm.add('(min-width: 768px)', () => {
          const panels = gsap.utils.toArray<HTMLElement>('.feature-panel');
          const featureTl = gsap.timeline({
            scrollTrigger: {
              trigger: '.features-pin',
              start: 'top top',
              end: '+=240%',
              pin: true,
              scrub: 0.6,
            },
          });
          panels.forEach((panel, i) => {
            if (i > 0) {
              featureTl.fromTo(
                panel,
                { yPercent: 16, autoAlpha: 0, scale: 0.96 },
                { yPercent: 0, autoAlpha: 1, scale: 1, duration: 1 },
                i
              );
            }
            if (i < panels.length - 1) {
              featureTl.to(
                panel,
                { yPercent: -10, autoAlpha: 0, scale: 0.97, duration: 1 },
                i + 0.72
              );
            }
          });
          featureTl.to('.feature-progress-fill', { scaleX: 1, ease: 'none', duration: panels.length }, 0);
        });

        // ---- Mobile features: simple staggered reveals -----------------------
        mm.add('(max-width: 767px)', () => {
          gsap.utils.toArray<HTMLElement>('.feature-panel').forEach((panel) => {
            gsap.from(panel, {
              y: 48,
              autoAlpha: 0,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: { trigger: panel, start: 'top 82%' },
            });
          });
        });

        // ---- Generic section reveals ----------------------------------------
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            y: 56,
            autoAlpha: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          });
        });

        // ---- How-it-works: line draws while steps slide in --------------------
        gsap.from('.timeline-line', {
          scaleY: 0,
          transformOrigin: 'top center',
          ease: 'none',
          scrollTrigger: {
            trigger: '.timeline-wrap',
            start: 'top 70%',
            end: 'bottom 55%',
            scrub: true,
          },
        });
        gsap.utils.toArray<HTMLElement>('.timeline-step').forEach((step, i) => {
          gsap.from(step, {
            x: i % 2 === 0 ? -56 : 56,
            autoAlpha: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: step, start: 'top 80%' },
          });
        });

        // ---- Stat counters ----------------------------------------------------
        gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el) => {
          const target = Number(el.dataset.value ?? 0);
          const suffix = el.dataset.suffix ?? '';
          const counter = { val: 0 };
          gsap.to(counter, {
            val: target,
            duration: 1.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
            onUpdate: () => {
              el.textContent = `${Math.round(counter.val)}${suffix}`;
            },
          });
        });

        // ---- Marquee skews with scroll velocity --------------------------------
        const marqueeInner = root.querySelector('.marquee-track');
        if (marqueeInner) {
          ScrollTrigger.create({
            trigger: '.marquee-section',
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => {
              gsap.to(marqueeInner, {
                skewX: gsap.utils.clamp(-8, 8, self.getVelocity() / -180),
                duration: 0.6,
                ease: 'power2.out',
                overwrite: 'auto',
              });
            },
          });
        }

        // ---- Final CTA: word-by-word rise --------------------------------------
        gsap.from('.cta-word', {
          yPercent: 110,
          duration: 0.8,
          stagger: 0.07,
          ease: 'power4.out',
          scrollTrigger: { trigger: '.cta-heading', start: 'top 80%' },
        });
      }, root);

      return () => {
        ctx.revert();
        cursorCleanup?.();
        gsap.ticker.remove(tick);
        lenis?.destroy();
        lenis = null;
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative overflow-x-clip bg-iron-950">
      {/* Cursor glow */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[90] hidden opacity-0 md:block"
        style={{
          width: 480,
          height: 480,
          marginLeft: -240,
          marginTop: -240,
          background:
            'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 60%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* ============================== NAV ============================== */}
      <header className="landing-nav fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-iron-950/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-chalk transition-colors hover:text-blood-glow">
            <LiftlyLogo size={30} />
          </Link>
          <div className="hidden items-center gap-9 font-mono text-sm tracking-[0.15em] text-chalk-dim md:flex">
            <a href="#features" className="nav-link">FEATURES</a>
            <a href="#how" className="nav-link">HOW IT WORKS</a>
            <a href="#coaches" className="nav-link">FOR COACHES</a>
            <Link href="/blog" className="nav-link">GUIDES</Link>
            <Link href="/pricing" className="nav-link">PRICING</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={dashboardHref ?? '/login'}
              className="hidden font-mono text-sm tracking-[0.15em] text-chalk-dim transition-colors hover:text-chalk sm:block"
            >
              {dashboardHref ? 'GO TO DASHBOARD' : 'SIGN IN'}
            </Link>
            <Magnetic strength={0.25}>
              <Link href={startHref} className="btn-primary !min-h-[44px] !px-5 !py-2.5 !text-sm">
                Start Lifting
              </Link>
            </Magnetic>
          </div>
        </nav>
      </header>

      {/* ============================== HERO ============================== */}
      <section className="hero-section relative flex min-h-[100svh] flex-col justify-center overflow-hidden">
        <HeroScene className="hero-canvas absolute inset-0" />
        {/* Legibility scrim behind the copy + bottom fade into the next section */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[72%] bg-gradient-to-r from-iron-950/85 via-iron-950/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-iron-950" />

        <div className="hero-copy relative z-10 mx-auto w-full max-w-6xl px-6 pt-24">
          <p className="hero-kicker mb-7 font-mono text-sm tracking-[0.35em] text-blood">
            ──── AI POWERLIFTING COACH ────
          </p>

          <h1
            aria-label={HEADLINE}
            className="stencil-heading mb-8 text-[clamp(2.6rem,8.5vw,7rem)] leading-[0.95] text-chalk"
          >
            {HEADLINE.split(' ').map((word, wi) => (
              <span
                key={wi}
                aria-hidden="true"
                className="mr-[0.28em] inline-block overflow-hidden pb-[0.08em] align-bottom last:mr-0"
              >
                {word.split('').map((char, ci) => (
                  <span key={ci} className="hero-char inline-block will-change-transform">
                    {char}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <p className="hero-sub mb-10 max-w-xl font-body text-xl text-chalk-dim">
            Block periodization. Form check from your phone. Macros built for
            powerlifting. Built for lifters counting plates, not steps.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Magnetic className="hero-cta">
              <Link href={startHref} className="btn-primary !px-7 !py-3.5 text-base">
                Start Lifting →
              </Link>
            </Magnetic>
            <Magnetic className="hero-cta" strength={0.25}>
              <Link href="/coach/login" className="btn-ghost">
                For Coaches
              </Link>
            </Magnetic>
            <Magnetic className="hero-cta" strength={0.25}>
              <a href="#features" className="btn-ghost">
                Explore ↓
              </a>
            </Magnetic>
          </div>
        </div>

        <div className="hero-scroll-hint absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-center">
          <div className="mx-auto mb-2 h-9 w-[1.5px] overflow-hidden rounded bg-iron-700">
            <div className="scroll-hint-bead h-3 w-full rounded bg-blood" />
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-chalk-mute">SCROLL</span>
        </div>
      </section>

      {/* ============================ MARQUEE ============================ */}
      <section className="marquee-section relative border-y border-iron-800 bg-iron-900/40 py-5" aria-hidden="true">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-strip flex shrink-0 items-center">
              {MARQUEE_WORDS.map((word) => (
                <span key={`${copy}-${word}`} className="flex items-center">
                  <span className="stencil-heading px-6 text-2xl text-chalk-mute md:text-3xl">
                    {word}
                  </span>
                  <span className="text-blood">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section id="features" className="features-pin relative flex min-h-screen flex-col justify-center py-24 md:py-0">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div data-reveal className="mb-12 md:mb-16">
            <p className="mb-3 font-mono text-sm tracking-[0.35em] text-blood">
              <ScrambleText text="// THE SYSTEM" />
            </p>
            <h2 className="stencil-heading text-5xl text-chalk md:text-6xl">
              Three tools.
              <br />
              <span className="text-chalk-mute">Zero guesswork.</span>
            </h2>
          </div>

          <div className="relative md:h-[380px]">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.num}
                className={`feature-panel mb-8 md:absolute md:inset-0 md:mb-0 ${i > 0 ? 'md:opacity-0' : ''}`}
              >
                <TiltCard className="chalk-card relative grid h-full grid-cols-1 gap-8 overflow-hidden p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:p-12">
                  <div className="stencil-heading select-none text-[5rem] leading-none text-iron-700 md:text-[9rem]">
                    {feature.num}
                  </div>
                  <div>
                    <p className="mb-2 font-mono text-xs tracking-[0.3em] text-blood">
                      {feature.tag}
                    </p>
                    <h3 className="stencil-heading mb-4 text-3xl text-chalk md:text-4xl">
                      {feature.title}
                    </h3>
                    <p className="max-w-lg text-base text-chalk-dim">{feature.body}</p>
                  </div>
                  <ul className="space-y-3 font-mono text-sm text-chalk-mute">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5">
                        <span className="h-1 w-4 rounded bg-blood" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </TiltCard>
              </div>
            ))}
          </div>

          {/* Progress rail (desktop pin only) */}
          <div className="mt-10 hidden h-[2px] w-full overflow-hidden rounded bg-iron-800 md:block">
            <div className="feature-progress-fill h-full w-full origin-left scale-x-0 bg-blood" />
          </div>
        </div>
      </section>

      {/* ========================== HOW IT WORKS ========================== */}
      <section id="how" className="relative py-28 md:py-36">
        <div className="mx-auto max-w-5xl px-6">
          <div data-reveal className="mb-20 text-center">
            <p className="mb-3 font-mono text-sm tracking-[0.35em] text-blood">
              <ScrambleText text="// THE PROCESS" />
            </p>
            <h2 className="stencil-heading text-5xl text-chalk md:text-6xl">
              Chalk up to peak.
            </h2>
          </div>

          <div className="timeline-wrap relative">
            <div className="timeline-line absolute left-5 top-0 h-full w-[2px] bg-gradient-to-b from-blood via-blood to-transparent md:left-1/2 md:-translate-x-1/2" />
            <ol className="space-y-16 md:space-y-24">
              {STEPS.map((step, i) => (
                <li
                  key={step.num}
                  className={`timeline-step relative pl-16 md:w-[calc(50%-3rem)] md:pl-0 ${
                    i % 2 === 0 ? 'md:mr-auto md:text-right' : 'md:ml-auto'
                  }`}
                >
                  <span
                    className={`absolute left-5 top-1 flex h-3 w-3 -translate-x-1/2 items-center justify-center md:top-2 ${
                      i % 2 === 0 ? 'md:left-[calc(100%+3rem)]' : 'md:left-[-3rem]'
                    }`}
                  >
                    <span className="absolute h-3 w-3 rounded-full bg-blood" />
                    <span className="absolute h-3 w-3 animate-ping rounded-full bg-blood/60" />
                  </span>
                  <p className="mb-2 font-mono text-sm tracking-[0.25em] text-blood">
                    STEP {step.num}
                  </p>
                  <h3 className="stencil-heading mb-3 text-2xl text-chalk md:text-3xl">
                    {step.title}
                  </h3>
                  <p className="text-base leading-relaxed text-chalk-mute md:text-lg">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============================= STATS ============================= */}
      <section className="border-y border-iron-800 bg-iron-900/40 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} data-reveal className="text-center">
              <div
                className="stat-value stencil-heading mb-2 text-5xl text-chalk md:text-6xl"
                data-value={stat.value}
                data-suffix={stat.suffix}
              >
                {stat.value}
                {stat.suffix}
              </div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-chalk-mute">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ COACHES ============================ */}
      <section id="coaches" className="py-28 md:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2">
          <div data-reveal>
            <p className="mb-3 font-mono text-sm tracking-[0.35em] text-blood">
              <ScrambleText text="// FOR COACHES" />
            </p>
            <h2 className="stencil-heading mb-6 text-4xl text-chalk md:text-5xl">
              Your whole roster,
              <br />
              <span className="text-chalk-mute">one glance.</span>
            </h2>
            <p className="mb-8 max-w-md text-base text-chalk-dim">
              The AI takes the first pass on every client. It flags the ones who
              need you, drafts the adjustment, and waits. You approve every
              change. Nothing ships without your sign-off.
            </p>
            <Magnetic>
              <Link href="/coach/login" className="btn-primary">
                Open the Coach Console →
              </Link>
            </Magnetic>
          </div>

          <div data-reveal>
            <TiltCard className="chalk-card relative overflow-hidden p-6">
              <div className="mb-4 flex items-center justify-between border-b border-iron-800 pb-4">
                <span className="font-mono text-sm tracking-[0.2em] text-chalk-mute">
                  ROSTER TRIAGE
                </span>
                <span className="font-mono text-xs text-blood">LIVE</span>
              </div>
              {[
                { name: 'M. Okafor', flag: 'Readiness low · deload drafted', tone: 'text-rpe-hard' },
                { name: 'S. Lindqvist', flag: 'Bench stalled 2 weeks · variation queued', tone: 'text-rpe-mod' },
                { name: 'J. Park', flag: 'On track · peak week begins Monday', tone: 'text-rpe-easy' },
                { name: 'A. Reyes', flag: 'PR squat logged · program advanced', tone: 'text-rpe-easy' },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between gap-4 border-b border-iron-800/60 py-3.5 last:border-0"
                >
                  <span className="font-body text-base font-semibold text-chalk">{row.name}</span>
                  <span className={`font-mono text-xs ${row.tone}`}>{row.flag}</span>
                </div>
              ))}
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ============================ FINAL CTA ============================ */}
      <section className="relative overflow-hidden py-32 md:py-44">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(700px circle at 50% 110%, rgba(59,130,246,0.18), transparent 65%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="cta-heading stencil-heading mb-10 text-[clamp(2.4rem,7vw,5.5rem)] leading-[1.02] text-chalk">
            {'The platform is waiting.'.split(' ').map((word, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                <span className="cta-word mr-[0.26em] inline-block will-change-transform">
                  {word}
                </span>
              </span>
            ))}
          </h2>
          <Magnetic>
            <Link href={startHref} className="btn-primary !px-9 !py-4 !text-base">
              Start Lifting →
            </Link>
          </Magnetic>
          <p className="mt-6 font-mono text-xs text-chalk-mute">
            Free to start. No push notifications. No fluff.
          </p>
        </div>
      </section>

      {/* ============================= FOOTER ============================= */}
      <footer className="border-t border-iron-800 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <Link href="/" className="text-chalk-dim transition-colors hover:text-chalk">
              <LiftlyLogo size={22} />
            </Link>
            <nav className="flex items-center gap-6 font-mono text-xs tracking-[0.15em] text-chalk-mute">
              <Link href="/blog" className="transition-colors hover:text-chalk-dim">GUIDES</Link>
              <Link href="/privacy" className="transition-colors hover:text-chalk-dim">PRIVACY</Link>
            </nav>
            <span className="font-mono text-xs text-chalk-mute">
              Powered by Anthropic Claude
            </span>
          </div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-iron-600">
            NO FLUFF · NO PUSH NOTIFICATIONS · BUILT FOR THE PLATFORM
          </p>
        </div>
      </footer>
    </div>
  );
}
