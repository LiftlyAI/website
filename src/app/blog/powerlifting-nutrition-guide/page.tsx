import { Metadata } from 'next';
import {
  BlogPost,
  H2, H3, P, DefinitionBlock, DataTable, Th, Td,
  Ul, Li, Callout, FAQSection, FAQItem,
} from '@/components/blog/BlogPost';

export const metadata: Metadata = {
  title: 'Powerlifting Nutrition: How to Eat for Strength and a Meet',
  description:
    'Calorie targets using Mifflin-St Jeor and Katch-McArdle, protein per kg lean body mass, training-day cycling, and the meet-week protocol, grounded in the research.',
  openGraph: {
    title: 'Powerlifting Nutrition: How to Eat for Strength and a Meet',
    description:
      'Calorie targets, protein per kg LBM, training-day cycling, and the meet-week protocol, all grounded in the research.',
    type: 'article',
    url: 'https://liftly.tech/blog/powerlifting-nutrition-guide',
  },
  alternates: { canonical: 'https://liftly.tech/blog/powerlifting-nutrition-guide' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Powerlifting Nutrition: How to Eat for Strength and a Meet',
      description:
        'Calorie targets, protein per kg LBM, training-day cycling, and the meet-week protocol, grounded in the research.',
      author: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      publisher: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      datePublished: '2026-06-12',
      dateModified: '2026-06-12',
      url: 'https://liftly.tech/blog/powerlifting-nutrition-guide',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How much protein do powerlifters need?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Powerlifters need 1.8–2.3 g of protein per kg of lean body mass per day, depending on phase. The higher end (2.3 g/kg) applies during a calorie deficit to preserve muscle. These targets are based on the Morton 2018 meta-analysis and the ISSN position stand on protein.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do you cut weight for a powerlifting meet?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Cut 2–4 weeks out using a modest calorie deficit (−300 to −400 kcal/day) to lose 0.5–1% of bodyweight per week. Avoid aggressive cuts that impair training performance. If a same-day or 24-hour water cut is required, that is managed with fluid and sodium reduction, not food restriction.',
          },
        },
        {
          '@type': 'Question',
          name: 'What should I eat the day of a powerlifting meet?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Eat a normal meal 2–3 hours before lifting. Between attempts and sessions, eat simple carbs (rice cakes, bananas, sports drinks) and moderate protein. Avoid anything that causes GI distress. Stay hydrated. Most lifters eat more than they feel hungry for on meet day, which is correct.',
          },
        },
        {
          '@type': 'Question',
          name: 'Should powerlifters eat more than bodybuilders?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Powerlifters and bodybuilders in a gaining phase have similar calorie and protein requirements. The difference is goal: powerlifters prioritize peak performance on specific training days and a meet, while bodybuilders optimize year-round leanness. Meet-week nutrition for powerlifters emphasizes fuel, not restriction.',
          },
        },
      ],
    },
  ],
};

export default function NutritionGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPost
        title="Powerlifting Nutrition: How to Eat for Strength and a Meet"
        date="June 2026"
        readTime="7 min read"
        category="NUTRITION"
      >
        <DefinitionBlock>
          Powerlifting nutrition means eating to maximize strength output across a training cycle,
          not to minimize bodyweight or chase a general health outcome. Calorie and protein targets
          come from training frequency, bodyweight, body composition, and phase goal: gaining,
          maintaining, or cutting into a weight class. The math differs from general fitness
          nutrition, above all around protein targets and meet-week protocol.
        </DefinitionBlock>

        <H2>Calorie targets</H2>
        <P>
          Base calories are calculated from BMR (Basal Metabolic Rate) × an activity multiplier,
          then adjusted by training phase.
        </P>

        <H3>BMR formulas</H3>
        <P>
          Liftly uses Katch-McArdle when body fat percentage is known (more accurate for trained
          athletes), and Mifflin-St Jeor as a fallback:
        </P>

        <DataTable>
          <thead>
            <tr>
              <Th>Formula</Th>
              <Th>When used</Th>
              <Th>Equation</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td highlight>Katch-McArdle</Td>
              <Td>Body fat % known</Td>
              <Td>370 + (21.6 × lean mass in kg)</Td>
            </tr>
            <tr>
              <Td highlight>Mifflin-St Jeor</Td>
              <Td>Body fat % unknown</Td>
              <Td>10 × kg + 6.25 × cm − 5 × age (+ 5 men / −161 women)</Td>
            </tr>
          </tbody>
        </DataTable>

        <H3>Activity multipliers</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Training frequency</Th>
              <Th>Multiplier</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['3 days/week or fewer', '1.55'],
              ['4–5 days/week', '1.65'],
              ['6+ days/week', '1.725'],
            ].map(([freq, mult]) => (
              <tr key={freq}>
                <Td>{freq}</Td>
                <Td highlight>{mult}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H3>Phase adjustments</H3>

        <DataTable>
          <thead>
            <tr>
              <Th>Phase goal</Th>
              <Th>Calorie adjustment</Th>
              <Th>Rationale</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Gaining (novice)', '+400 kcal/day', 'Novices build muscle faster and tolerate a larger surplus'],
              ['Gaining (intermediate/advanced)', '+250 kcal/day', 'Smaller surplus that limits fat gain without capping muscle growth (Iraki/Helms, Slater et al.)'],
              ['Maintaining', '±0 kcal', 'TDEE, which supports performance without body composition change'],
              ['Cutting', '−400 kcal/day', 'Mid-range of −300 to −500 kcal, preserving strength while losing weight'],
            ].map(([phase, adj, rat]) => (
              <tr key={phase}>
                <Td highlight>{phase}</Td>
                <Td>{adj}</Td>
                <Td>{rat}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H2>Protein targets</H2>
        <P>
          Protein targets come from lean body mass (LBM), not total bodyweight. Fat mass doesn't drive
          muscle protein synthesis, so total bodyweight overprescribes protein for heavier lifters and
          underprescribes for leaner ones.
        </P>

        <DataTable>
          <thead>
            <tr>
              <Th>Phase</Th>
              <Th>Protein per kg LBM</Th>
              <Th>Research basis</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Gaining', '2.0 g/kg', 'Morton 2018 meta-analysis (practical default; CI reaches 2.2 g/kg)'],
              ['Maintaining', '1.8 g/kg', 'ISSN position stand, mid of the 1.4–2.0 g/kg range'],
              ['Cutting', '2.3 g/kg', 'Elevated to preserve muscle mass during a calorie deficit'],
            ].map(([phase, prot, res]) => (
              <tr key={phase}>
                <Td highlight>{phase}</Td>
                <Td>{prot}</Td>
                <Td>{res}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <Callout>
          Example: a 90 kg lifter at 15% body fat has an LBM of 76.5 kg. In a gaining phase, the
          protein target is 153 g/day (76.5 × 2.0). Using total bodyweight would give 180 g/day,
          27 g/day more than the evidence supports.
        </Callout>

        <H3>Per-meal protein distribution</H3>
        <P>
          The muscle protein synthesis (MPS) threshold per sitting is about 0.4 g/kg LBM per meal.
          For the lifter above, that's about 31 g per meal. Spread total protein across 3–6 meals
          through the day; the exact number matters less than hitting the daily total.
        </P>

        <H2>Fat targets</H2>
        <P>
          Fat is set at 25% of total calories (mid of the ISSN recommendation of 20–35%), with a
          floor of 15% to protect hormonal function. For most competitive powerlifters, this lands
          between 0.8–1.2 g/kg total bodyweight per day. Carbohydrates fill the calories left after
          protein and fat, and they're the primary fuel for high-intensity lifting.
        </P>

        <H2>Training-day vs. rest-day cycling</H2>
        <P>
          Total daily calories don't need to be identical every day. Training days burn more glycogen
          and have higher recovery demands; rest days require less fuel. A simple approach:
        </P>
        <Ul>
          <Li>Training days: TDEE + phase adjustment (carbohydrates lead the variance)</Li>
          <Li>Rest days: TDEE − 100 to −200 kcal, mostly from carbohydrates</Li>
          <Li>Protein target: stays constant every day regardless of training status</Li>
        </Ul>

        <H2>Meet-week nutrition</H2>
        <P>
          Meet week is not the time to restrict calories. The goal is to arrive on the platform
          well-fueled, not at minimum bodyweight. The error most lifters make is treating meet week
          like a deload in food as well as training.
        </P>

        <H3>If you are not cutting weight</H3>
        <P>
          Eat normally throughout meet week. Maintain protein, keep carbohydrates moderate to high,
          and sleep well. The only change is cutting training volume; food stays the same.
        </P>

        <H3>If you are cutting weight</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Timeframe</Th>
              <Th>Protocol</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['7 days out', 'Normal calories, moderate carbs, full protein'],
              ['3–4 days out', 'Begin water management if cutting: reduce sodium, increase water intake, then restrict the day before'],
              ['24 hours out', 'Carb load: 6–10 g carbs/kg LBM over the day before weigh-in'],
              ['Day of (post weigh-in)', 'Eat immediately after weigh-in. Simple carbs between flights. Keep protein moderate.'],
              ['Between attempts', 'Simple carbs (rice cakes, bananas, sports drinks). Small amounts, nothing that causes GI distress.'],
            ].map(([time, proto]) => (
              <tr key={time}>
                <Td highlight>{time}</Td>
                <Td>{proto}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H2>How Liftly calculates your nutrition targets</H2>
        <P>
          Liftly runs the Katch-McArdle or Mifflin-St Jeor BMR formula based on your profile,
          applies the activity multiplier for your training frequency, and adds the phase-appropriate
          adjustment. Protein is set per kg of your lean body mass. Carbohydrates fill the remaining
          calorie budget after protein and fat are accounted for.
        </P>
        <P>
          When your bodyweight or training phase changes, the targets update on their own. If you
          entered body fat percentage, the app uses Katch-McArdle; otherwise it falls back to
          Mifflin-St Jeor.
        </P>

        <FAQSection>
          <FAQItem question="How much protein do powerlifters need?">
            Powerlifters need 1.8–2.3 g of protein per kg of lean body mass per day, depending on
            phase. The higher end (2.3 g/kg LBM) applies during a calorie deficit to preserve muscle
            mass. These targets are based on the Morton 2018 meta-analysis and the ISSN position
            stand on protein and exercise.
          </FAQItem>
          <FAQItem question="How do you cut weight for a powerlifting meet?">
            Cut 2–4 weeks out using a modest calorie deficit (−300 to −400 kcal/day) to lose
            0.5–1% of bodyweight per week. Avoid aggressive cuts that impair training performance.
            If a same-day or 24-hour water cut is required, manage it with fluid and sodium
            reduction, not food restriction.
          </FAQItem>
          <FAQItem question="What should I eat the day of a powerlifting meet?">
            Eat a normal meal 2–3 hours before your first lift. Between attempts and sessions: simple
            carbs (rice cakes, bananas, fruit, sports drinks) and moderate protein. Avoid anything
            that causes GI distress. Stay hydrated. Most lifters eat more than they feel hungry for
            on meet day, which is correct.
          </FAQItem>
          <FAQItem question="Should powerlifters eat more than bodybuilders?">
            In a gaining phase, calorie and protein requirements are similar. The key difference is
            goal: powerlifters optimize for performance on specific training days and a meet day,
            while bodybuilders optimize year-round leanness. Meet-week nutrition for powerlifters
            emphasizes fueling performance, not restriction.
          </FAQItem>
        </FAQSection>
      </BlogPost>
    </>
  );
}
