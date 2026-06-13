import { Metadata } from 'next';
import {
  BlogPost,
  H2, H3, P, DefinitionBlock, DataTable, Th, Td,
  Ul, Li, Ol, Oli, Callout, FAQSection, FAQItem,
} from '@/components/blog/BlogPost';

export const metadata: Metadata = {
  title: 'RPE in Powerlifting: The Complete Guide',
  description:
    'The full RPE scale, Tuchscherer percentages, how to calibrate your RPE, and why autoregulation beats fixed loading for intermediate and advanced lifters.',
  openGraph: {
    title: 'RPE in Powerlifting: The Complete Guide',
    description:
      'The full RPE scale, Tuchscherer percentages, calibration tips, and why autoregulation beats fixed loading.',
    type: 'article',
    url: 'https://liftly.tech/blog/rpe-powerlifting-guide',
  },
  alternates: { canonical: 'https://liftly.tech/blog/rpe-powerlifting-guide' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'RPE in Powerlifting: The Complete Guide',
      description:
        'The full RPE scale, Tuchscherer percentages, how to calibrate your RPE, and why autoregulation beats fixed loading.',
      author: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      publisher: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      datePublished: '2025-06-12',
      dateModified: '2025-06-12',
      url: 'https://liftly.tech/blog/rpe-powerlifting-guide',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does RPE mean in powerlifting?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'RPE (Rate of Perceived Exertion) is a 1–10 scale measuring how hard a set felt relative to maximum effort. In powerlifting, RPE 10 is a true max — no more reps possible. Each point below 10 represents one additional rep in reserve: RPE 9 means one rep left, RPE 8 means two reps left.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is a good RPE for training?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most working sets in powerlifting fall between RPE 7–9. Accumulation blocks typically target RPE 7–8 to manage volume. Intensification blocks push to RPE 8–9. Peaking blocks approach RPE 9–10 in preparation for meet day.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is RPE better than percentages for powerlifting?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'For intermediate and advanced lifters, RPE is more accurate because it accounts for daily strength variation caused by fatigue, sleep, stress, and hydration. Percentages assume a fixed 1RM that doesn\'t change — RPE adapts to your actual strength on that day.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is RPE 8 in powerlifting?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'RPE 8 means two reps in reserve — you completed the set and felt you could have done two more before failure. For a single rep at RPE 8, you\'re lifting approximately 94% of your 1RM according to the Tuchscherer RPE chart.',
          },
        },
      ],
    },
  ],
};

export default function RPEGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPost
        title="RPE in Powerlifting: The Complete Guide"
        date="June 2025"
        readTime="6 min read"
        category="TRAINING METHODOLOGY"
      >
        <DefinitionBlock>
          RPE (Rate of Perceived Exertion) is a 1–10 scale used in powerlifting to gauge how hard a
          set felt relative to maximum effort. RPE 10 is a true maximum — no additional reps were
          possible. Each point below 10 represents one rep left in reserve: RPE 9 means one rep left,
          RPE 8 means two reps left. The scale was adapted for powerlifting by Mike Tuchscherer of
          Reactive Training Systems.
        </DefinitionBlock>

        <P>
          RPE transforms training from a fixed prescription into a conversation between the athlete
          and the bar. Rather than hitting a rigid percentage of a 1RM that may have shifted due to
          fatigue or a good night's sleep, you work to a level of effort — and the program adapts
          accordingly.
        </P>

        <H2>The RPE scale</H2>

        <DataTable>
          <thead>
            <tr>
              <Th>RPE</Th>
              <Th>Reps in reserve</Th>
              <Th>What it feels like</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['10', '0', 'Max effort — could not have done another rep.'],
              ['9.5', '0–1', 'Could maybe do 1 more rep, not certain.'],
              ['9', '1', 'Could definitely do 1 more rep.'],
              ['8.5', '1–2', 'Could do 1–2 more reps.'],
              ['8', '2', 'Could do 2 more reps.'],
              ['7.5', '2–3', 'Could do 2–3 more reps.'],
              ['7', '3', 'Could do 3 more reps.'],
              ['6', '4+', 'Relatively easy. Good technique weight.'],
              ['5', '5+', 'Light. Bar moves fast throughout.'],
            ].map(([rpe, rir, desc]) => (
              <tr key={rpe}>
                <Td highlight>{rpe}</Td>
                <Td>{rir}</Td>
                <Td>{desc}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H2>RPE and percentage of 1RM</H2>
        <P>
          Each combination of reps × RPE corresponds to a known percentage of your 1RM. This is the
          Tuchscherer chart — the same one Liftly uses to estimate your e1RM from every logged set.
          A set of 3 reps at RPE 9, for example, tells the program you lifted 91% of your current
          maximum, which gives a precise e1RM estimate without needing a true max attempt.
        </P>

        <DataTable>
          <thead>
            <tr>
              <Th>Reps</Th>
              <Th>RPE 7</Th>
              <Th>RPE 8</Th>
              <Th>RPE 9</Th>
              <Th>RPE 10</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1 rep', '91%', '94%', '96%', '100%'],
              ['2 reps', '88%', '91%', '94%', '96%'],
              ['3 reps', '85%', '88%', '91%', '94%'],
              ['4 reps', '83%', '86%', '89%', '92%'],
              ['5 reps', '81%', '84%', '86%', '89%'],
            ].map(([reps, ...vals]) => (
              <tr key={reps}>
                <Td highlight>{reps}</Td>
                {vals.map((v, i) => <Td key={i}>{v}</Td>)}
              </tr>
            ))}
          </tbody>
        </DataTable>

        <P>
          Source: Tuchscherer RPE chart (Reactive Training Systems), as implemented in Liftly's
          autoregulation engine.
        </P>

        <H2>Why powerlifters use RPE instead of fixed percentages</H2>
        <P>
          Percentage-based programming assumes your 1RM is constant. It isn't. Fatigue, sleep, stress,
          hydration, and training age all shift your actual strength day to day. A prescribed 85% can
          feel like RPE 9 when you're beat up and RPE 7 on a strong day.
        </P>
        <Ul>
          <Li>
            <strong className="text-chalk">Accounts for daily variation.</strong> A harder day
            doesn't force you into missed reps — the weight stays appropriate to how you're actually
            performing.
          </Li>
          <Li>
            <strong className="text-chalk">Works without a known 1RM.</strong> You don't need to test
            your max to use RPE-based programming — you back-calculate it from working sets.
          </Li>
          <Li>
            <strong className="text-chalk">Autoregulates fatigue.</strong> As a block progresses and
            fatigue accumulates, the same weight starts feeling harder — RPE captures that signal
            automatically.
          </Li>
          <Li>
            <strong className="text-chalk">Keeps progression honest.</strong> Strong days push load
            forward; weak days protect recovery without wasting a session.
          </Li>
        </Ul>

        <H2>RPE vs. percentage-based programming</H2>

        <DataTable>
          <thead>
            <tr>
              <Th>Feature</Th>
              <Th>RPE-based</Th>
              <Th>Percentage-based</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Accounts for daily variation', 'Yes', 'No'],
              ['Works without a known 1RM', 'Yes', 'No'],
              ['Requires calibration period', 'Yes', 'No'],
              ['Good for beginners', 'Less ideal', 'Better'],
              ['Captures accumulated fatigue', 'Yes', 'No'],
              ['Prescribes exact weights', 'No — works to effort', 'Yes'],
            ].map(([feat, rpe, pct]) => (
              <tr key={feat}>
                <Td highlight>{feat}</Td>
                <Td>{rpe}</Td>
                <Td>{pct}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H2>How to calibrate your RPE</H2>
        <P>
          New lifters consistently underrate their RPE — they call hard sets RPE 8 when they're true
          9s, because they haven't yet hit a real 10 to anchor the scale. Calibration takes time and
          deliberate practice.
        </P>
        <Ol>
          <Oli num={1}>
            <strong className="text-chalk">Film your sets.</strong> Bar speed at the sticking point
            reveals true effort better than feel alone. A slow, grinding rep that you called RPE 8
            often turns out to be a 9 on video.
          </Oli>
          <Oli num={2}>
            <strong className="text-chalk">Occasionally push to RPE 10.</strong> You can't calibrate
            the scale without anchoring the top end. Attempt a true max periodically — carefully, with
            a spotter — so you know what 10 actually feels like.
          </Oli>
          <Oli num={3}>
            <strong className="text-chalk">Review your misses.</strong> If you miss a rep, that prior
            set was RPE 10, not the 8.5 you called it. Recalibrate backward from missed attempts.
          </Oli>
          <Oli num={4}>
            <strong className="text-chalk">Give yourself 3–6 months.</strong> RPE accuracy improves
            meaningfully with training age. Early calibration errors are normal — the goal is
            progressive improvement, not precision from day one.
          </Oli>
        </Ol>

        <H2>How Liftly uses RPE</H2>
        <P>
          Every set logged in Liftly includes weight, reps, and RPE. The app looks up the
          corresponding percentage in the Tuchscherer chart, calculates an e1RM, takes a rolling best
          across recent sessions (so one bad day can't tank your numbers), and recalculates your next
          session's targets. You see the new prescribed weight, the old one struck through, and a
          one-line reason — "from your last squat session's e1RM."
        </P>

        <Callout>
          Example: logging a squat triple at a higher e1RM than the program expected moved the next
          squat target from 125 lbs to 165 lbs, automatically. Grind harder than expected on a lift
          and the number goes down instead — no manual recalculation needed.
        </Callout>

        <FAQSection>
          <FAQItem question="What does RPE mean in powerlifting?">
            RPE (Rate of Perceived Exertion) is a 1–10 scale measuring how hard a set felt relative
            to maximum effort. RPE 10 is a true max — no more reps possible. Each point below 10
            represents one additional rep in reserve: RPE 9 means one rep left, RPE 8 means two reps
            left.
          </FAQItem>
          <FAQItem question="What is a good RPE for training?">
            Most working sets in powerlifting fall between RPE 7–9. Accumulation blocks typically
            target RPE 7–8 to manage volume. Intensification blocks push to RPE 8–9. Peaking blocks
            approach RPE 9–10 in preparation for meet day.
          </FAQItem>
          <FAQItem question="Is RPE better than percentages for powerlifting?">
            For intermediate and advanced lifters, yes. RPE accounts for daily variation in strength
            caused by fatigue, sleep, stress, and hydration — factors that fixed percentages ignore.
            Beginners benefit from the simplicity of percentage-based loading while they develop their
            RPE calibration.
          </FAQItem>
          <FAQItem question="What is RPE 8 in powerlifting?">
            RPE 8 means two reps in reserve — you completed the set and felt you could have done two
            more before failure. For a single rep at RPE 8, you're lifting approximately 94% of your
            1RM according to the Tuchscherer RPE chart.
          </FAQItem>
        </FAQSection>
      </BlogPost>
    </>
  );
}
