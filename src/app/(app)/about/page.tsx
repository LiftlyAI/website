import {
  Repeat,
  TrendingUp,
  HeartPulse,
  CalendarCheck,
  ShieldOff,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: 'About · How your program adapts',
};

// Mirrors docs/how-the-program-adapts.md — keep the two in sync when the engine
// changes. This is the lifter-facing explanation of the closed loop.
export default function AboutPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-3xl">
      <div className="mb-8">
        <div className="font-mono text-xs text-chalk-mute tracking-widest mb-2">ABOUT</div>
        <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">
          HOW YOUR PROGRAM <span className="text-blood">ADAPTS</span>
        </h1>
        <div className="accent-divider mt-3 max-w-[120px]" />
        <p className="text-chalk-dim font-body mt-5 leading-relaxed">
          Liftly rebuilds your next targets from the sets you log. Every change comes with a reason,
          and you make the final call on the ones that matter.
        </p>
      </div>

      {/* The loop */}
      <div className="chalk-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Repeat className="w-4 h-4 text-blood" />
          <span className="stencil-heading text-sm text-chalk tracking-widest">THE LOOP</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
          {['PROGRAM', 'EXECUTE', 'REVIEW', 'ADAPT'].map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className="border border-blood/40 text-blood bg-blood/10 px-2 py-1 tracking-widest">
                {s}
              </span>
              <ArrowRight className="w-3 h-3 text-iron-700 last:hidden" />
            </span>
          ))}
          <span className="text-chalk-mute">↻ back to Execute</span>
        </div>
      </div>

      <Section icon={TrendingUp} title="1 · Your targets auto-tune from what you lift">
        <p>
          You log a working set: weight, reps, and the RPE it felt like. From that, a reps×RPE chart
          estimates your current 1-rep-max. It takes a rolling best across your recent sessions, so
          one bad day can’t tank your numbers, then works backward to next session’s weight and
          rounds it to a plate you can load.
        </p>
        <p>
          You see it the moment you save: a{' '}
          <em className="text-chalk not-italic font-medium">“what this changed”</em> panel with the
          new suggested weight, the old one struck through, and a one-line reason.
        </p>
        <Callout>
          Measured on your own data: a heavier squat triple moved the next squat target from{' '}
          <span className="font-mono text-rpe-easy">125 lbs</span> to{' '}
          <span className="font-mono text-rpe-easy">165 lbs</span>, tagged “from your last squat
          session’s e1RM.” Grind harder than expected and it moves down instead.
        </Callout>
        <p className="text-sm">
          Two rails sit inside the math. A <strong className="text-chalk">deload trigger</strong>: if
          your e1RM drifts down across sessions, it caps the next jump near −10% instead of pushing. A{' '}
          <strong className="text-chalk">rep regression</strong> for newer lifters: miss reps at a
          high RPE and it drops a rep to rebuild, say 3×5 down to 3×4.
        </p>
      </Section>

      <Section icon={HeartPulse} title="2 · Readiness is an optional override, never a forced deload">
        <p>
          Beat-up days happen. A 30-second check-in covers sleep, energy, soreness, stress, and an
          optional sharp-pain flag. It returns a green, amber, or red flag plus a{' '}
          <strong className="text-chalk">soft RPE ceiling</strong>: amber caps the top set near RPE 8,
          red near RPE 7.
        </p>
        <ul className="space-y-1.5">
          <Li>
            <strong className="text-chalk">It’s never required.</strong> Skip it forever and the loop
            works the same.
          </Li>
          <Li>
            <strong className="text-chalk">It suggests; you decide.</strong> The cap is a ceiling you
            can ignore: if the bar moves well, trust that over the number. The auto-tuning above never
            reads your readiness or rewrites your program behind your back.
          </Li>
          <Li>
            <strong className="text-chalk">Pain isn’t soreness.</strong> A pain flag points you toward
            mobility work, and a physio if it persists. Train the soreness. Get sharp pain looked at.
          </Li>
        </ul>
      </Section>

      <Section icon={CalendarCheck} title="3 · The weekly review and the “Sunday tweak”">
        <p>
          Once a week the Adapt step zooms out. You get{' '}
          <strong className="text-chalk">planned versus actual</strong> (sessions, tonnage, each
          lift’s top set), the findings below, and one{' '}
          <strong className="text-chalk">Sunday tweak</strong>: the single change worth making next
          week. When nothing flags and the work got done, it tells you to hold the line and run it
          back.
        </p>
        <div className="border border-iron-800 mt-2">
          {RULES.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.3fr] gap-x-4 px-3 py-2.5 border-b border-iron-800 last:border-b-0"
            >
              <div className="text-chalk text-sm font-medium">{r.signal}</div>
              <div className="text-chalk-mute text-sm">{r.action}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-chalk-mute">
          Each check fires when the data supports it. An empty week shows no findings instead of
          inventing busywork.
        </p>
      </Section>

      <Section icon={ShieldOff} title="What it will never do">
        <ul className="space-y-1.5">
          <Li>Change your training from a self-reported feeling without telling you.</Li>
          <Li>Claim a precise RPE or readiness number it can’t measure.</Li>
          <Li>Tell you to train through sharp or joint pain.</Li>
          <Li>
            Bury a deload inside the program. When one’s warranted, it says so in plain words, and the
            call is yours.
          </Li>
        </ul>
        <p className="text-chalk-dim font-body pt-1">
          You read a coach’s reasoning on the page, so you know{' '}
          <em className="text-blood not-italic">why</em> each number moved.
        </p>
      </Section>
    </div>
  );
}

const RULES = [
  { signal: 'Two sore days in a row', action: 'Take today’s top set to RPE −1' },
  { signal: 'Same form fault in ≥2 clips', action: 'A targeted technique drill before adding load' },
  { signal: 'e1RM flat across the block', action: 'Change one variable next block' },
  { signal: 'Big bar-speed drop in a set', action: 'Cap that set a rep earlier next time' },
];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="chalk-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blood shrink-0" />
        <h2 className="stencil-heading text-lg text-chalk">{title}</h2>
      </div>
      <div className="space-y-3 text-chalk-dim font-body leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-blood bg-blood/5 pl-3 py-2 text-sm text-chalk-dim">
      {children}
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[15px]">
      <span className="text-blood mt-0.5 shrink-0">→</span>
      <span>{children}</span>
    </li>
  );
}
