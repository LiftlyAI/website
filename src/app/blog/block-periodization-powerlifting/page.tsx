import { Metadata } from 'next';
import {
  BlogPost,
  H2, H3, P, DefinitionBlock, DataTable, Th, Td,
  Ul, Li, Callout, FAQSection, FAQItem,
} from '@/components/blog/BlogPost';

export const metadata: Metadata = {
  title: 'What Is Block Periodization for Powerlifting?',
  description:
    'How the three-phase system — accumulation, intensification, realization — builds strength for meet day. A complete guide for competitive powerlifters.',
  openGraph: {
    title: 'What Is Block Periodization for Powerlifting?',
    description:
      'How the three-phase system — accumulation, intensification, realization — builds strength for meet day.',
    type: 'article',
    url: 'https://liftly.tech/blog/block-periodization-powerlifting',
  },
  alternates: { canonical: 'https://liftly.tech/blog/block-periodization-powerlifting' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'What Is Block Periodization for Powerlifting?',
      description:
        'How the three-phase system — accumulation, intensification, realization — builds strength for meet day.',
      author: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      publisher: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      datePublished: '2025-06-12',
      dateModified: '2025-06-12',
      url: 'https://liftly.tech/blog/block-periodization-powerlifting',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is block periodization in powerlifting?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Block periodization is a training method that divides a powerlifting cycle into sequential phases — accumulation (hypertrophy), intensification (strength), and realization (peak) — each targeting a specific physiological adaptation. Each block lasts 3–6 weeks and builds on the previous one.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long is each block in block periodization?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Accumulation blocks last 4–6 weeks, intensification blocks 4–5 weeks, and realization (peak) blocks 2–3 weeks. A full cycle totals 10–14 weeks. Most competitive powerlifters run 2–3 full cycles per year.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is block periodization good for beginners?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Generally no. Beginners recover fast enough to add weight every session (linear periodization), so the complexity of block periodization is unnecessary. Switch to block structure when weekly linear progress stalls — typically 6–18 months into consistent training.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the difference between block periodization and linear periodization?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Linear periodization adds load each session without changing the intensity range. Block periodization changes the entire training focus each phase — high-volume hypertrophy first, then strength work, then peaking. Linear is simpler and better for beginners; block is more effective as recovery becomes the limiting factor.',
          },
        },
      ],
    },
  ],
};

export default function BlockPeriodizationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPost
        title="What Is Block Periodization for Powerlifting?"
        date="June 2025"
        readTime="8 min read"
        category="PROGRAM DESIGN"
      >
        <DefinitionBlock>
          Block periodization is a powerlifting training method that divides a training cycle into
          sequential phases — accumulation (hypertrophy), intensification (strength), and realization
          (peak) — each targeting a specific physiological adaptation. Unlike linear periodization,
          which adds weight every session, block periodization concentrates one type of stimulus per
          phase and builds on that foundation in the next block.
        </DefinitionBlock>

        <P>
          Most competitive powerlifters run two to three full cycles per year, each culminating in a
          meet or peak attempt. The framework was codified in modern strength sports through the work
          of Yuri Verkhoshansky and later adapted by coaches like Mike Tuchscherer and Greg Nuckols
          for the demands of powerlifting specifically.
        </P>

        <H2>The three phases</H2>

        <H3>1. Accumulation — hypertrophy block</H3>
        <P>
          Duration: 4–6 weeks. Intensity: 60–75% of 1RM. Rep ranges: 5–12. Volume: high.
        </P>
        <P>
          The goal is to build muscle mass and work capacity — the raw material that subsequent blocks
          convert into strength. Hypertrophy doesn't directly express itself on the platform, but it
          sets the ceiling for how strong you can eventually become. You can't convert muscle you
          haven't built.
        </P>

        <H3>2. Intensification — strength block</H3>
        <P>
          Duration: 4–5 weeks. Intensity: 75–90% of 1RM. Rep ranges: 2–5. Volume: moderate.
        </P>
        <P>
          The goal is to convert hypertrophy gains into sport-specific strength. Sets get heavier,
          reps come down, and neural efficiency improves — the body becomes better at recruiting and
          coordinating motor units for maximal force production. This is where most competitive
          lifters spend the majority of their training year.
        </P>

        <H3>3. Realization — peak block</H3>
        <P>
          Duration: 2–3 weeks. Intensity: 85–100%+ of 1RM. Rep ranges: 1–3. Volume: low.
        </P>
        <P>
          The goal is to peak performance for meet day. Volume drops to reduce accumulated fatigue
          and let fitness express itself. The final week (meet week) reduces training further still.
          You are not building fitness in this block — you are uncovering the fitness built in the
          previous eight to twelve weeks.
        </P>

        <DataTable>
          <thead>
            <tr>
              <Th>Block</Th>
              <Th>Duration</Th>
              <Th>Intensity</Th>
              <Th>Volume</Th>
              <Th>Primary goal</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td highlight>Accumulation</Td>
              <Td>4–6 weeks</Td>
              <Td>60–75% 1RM</Td>
              <Td>High</Td>
              <Td>Build muscle and work capacity</Td>
            </tr>
            <tr>
              <Td highlight>Intensification</Td>
              <Td>4–5 weeks</Td>
              <Td>75–90% 1RM</Td>
              <Td>Moderate</Td>
              <Td>Convert hypertrophy to strength</Td>
            </tr>
            <tr>
              <Td highlight>Realization</Td>
              <Td>2–3 weeks</Td>
              <Td>85–100%+ 1RM</Td>
              <Td>Low</Td>
              <Td>Peak performance for meet day</Td>
            </tr>
          </tbody>
        </DataTable>

        <H2>Block periodization vs. other training methods</H2>

        <DataTable>
          <thead>
            <tr>
              <Th>Method</Th>
              <Th>Best for</Th>
              <Th>Loading pattern</Th>
              <Th>Meet-specific</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td highlight>Block periodization</Td>
              <Td>Intermediate–advanced</Td>
              <Td>Phase-concentrated</Td>
              <Td>Yes — built-in peak</Td>
            </tr>
            <tr>
              <Td highlight>Linear periodization</Td>
              <Td>Beginners</Td>
              <Td>Add weight each session</Td>
              <Td>No</Td>
            </tr>
            <tr>
              <Td highlight>Daily undulating (DUP)</Td>
              <Td>Intermediate</Td>
              <Td>Varies by day</Td>
              <Td>Partial</Td>
            </tr>
            <tr>
              <Td highlight>Conjugate / Westside</Td>
              <Td>Advanced</Td>
              <Td>Max-effort + dynamic</Td>
              <Td>Yes — but complex</Td>
            </tr>
          </tbody>
        </DataTable>

        <H2>When to switch from linear to block periodization</H2>
        <P>
          Linear periodization works as long as you can recover fast enough to add weight each
          session. When weekly progress stalls — you're missing reps or grinding singles that should
          be smooth — the recovery demand has outgrown the simple model. For most lifters this
          happens somewhere between 6 and 18 months of consistent training. The signal is whether
          linear progress is still working, not how long you've been lifting.
        </P>

        <H2>How RPE fits into block periodization</H2>
        <P>
          RPE (Rate of Perceived Exertion) is the autoregulation layer that makes block periodization
          dynamic rather than rigid. Instead of prescribed fixed weights, you work to a target RPE
          within each block's intensity zone. A lighter day doesn't waste the session — you still hit
          the prescribed effort level. A stronger day pushes intensity forward automatically. Fatigue
          is captured in real time rather than causing missed reps at the end of a block.
        </P>

        <Callout>
          In Liftly, every logged set includes a weight, rep count, and RPE. The program estimates
          your current e1RM from those numbers using the Tuchscherer RPE chart, takes a rolling best
          across recent sessions, and recalculates your next session's targets — showing you the new
          weight, the old weight struck through, and a one-line reason why it moved.
        </Callout>

        <H2>How Liftly automates block periodization</H2>
        <P>
          Liftly generates your periodized blocks from your current 1RM estimates, training frequency,
          and weak-point flags from onboarding. The program advances through blocks as you log sessions
          and adjusts load automatically based on your most recent e1RM. The block structure —
          accumulation → intensification → realization — accounts for your timeline, whether that's a
          specific meet date or a rolling training cycle.
        </P>
        <Ul>
          <Li>1RM-driven loading: targets are set from your actual estimated maxes, not population averages.</Li>
          <Li>RPE autoregulation: load adjusts session by session without manual recalculation.</Li>
          <Li>Weak-point targeting: accessory work is biased toward your lagging lifts across each block.</Li>
          <Li>Deload detection: if your e1RM trends down across sessions, the program flags a deload rather than pushing blindly.</Li>
        </Ul>

        <FAQSection>
          <FAQItem question="What is block periodization in powerlifting?">
            Block periodization is a training method that divides a powerlifting cycle into sequential
            phases — accumulation (hypertrophy), intensification (strength), and realization (peak) —
            each targeting a specific adaptation. Each block lasts 3–6 weeks and builds on the previous
            one. Most competitive powerlifters run 2–3 full cycles per year.
          </FAQItem>
          <FAQItem question="How long is each block in block periodization?">
            Accumulation blocks last 4–6 weeks, intensification blocks 4–5 weeks, and realization
            (peak) blocks 2–3 weeks. A full cycle totals 10–14 weeks. The exact length depends on
            your training history, meet schedule, and individual recovery rate.
          </FAQItem>
          <FAQItem question="Is block periodization good for beginners?">
            Generally no. Beginners recover fast enough to add weight every session (linear
            periodization), so the complexity of block periodization is not needed. Switch to block
            structure when weekly linear progress stalls — typically 6–18 months into consistent
            training.
          </FAQItem>
          <FAQItem question="What is the difference between block and linear periodization?">
            Linear periodization adds load each session without changing the intensity range. Block
            periodization changes the entire training focus each phase — high-volume hypertrophy
            first, then strength-specific work, then peaking. Linear is simpler and more effective
            for beginners; block periodization is more appropriate as recovery becomes the limiting
            factor.
          </FAQItem>
        </FAQSection>
      </BlogPost>
    </>
  );
}
