import { Metadata } from 'next';
import {
  BlogPost,
  H2, H3, P, DefinitionBlock, DataTable, Th, Td,
  Ul, Li, Callout, FAQSection, FAQItem,
} from '@/components/blog/BlogPost';

export const metadata: Metadata = {
  title: 'Powerlifting Form Check: What Coaches Look For',
  description:
    'A lift-by-lift breakdown of squat, bench press, and deadlift form (bar path, brace, knee tracking, depth, and lockout), with common faults and how AI form check works.',
  openGraph: {
    title: 'Powerlifting Form Check: What Coaches Look For',
    description:
      'A lift-by-lift breakdown of squat, bench press, and deadlift: bar path, brace, knee tracking, and lockout.',
    type: 'article',
    url: 'https://liftly.tech/blog/powerlifting-form-check',
  },
  alternates: { canonical: 'https://liftly.tech/blog/powerlifting-form-check' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Powerlifting Form Check: What Coaches Look For',
      description:
        'A lift-by-lift breakdown of squat, bench press, and deadlift form: bar path, brace, knee tracking, depth, and lockout.',
      author: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      publisher: { '@type': 'Organization', name: 'Liftly', url: 'https://liftly.tech' },
      datePublished: '2026-06-12',
      dateModified: '2026-06-12',
      url: 'https://liftly.tech/blog/powerlifting-form-check',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is a form check in powerlifting?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A form check is a video review of a squat, bench press, or deadlift to identify technical faults that limit performance or increase injury risk. Coaches or AI systems analyze bar path, bracing, depth, knee tracking, and lockout to provide specific, actionable cues.',
          },
        },
        {
          '@type': 'Question',
          name: 'What camera angle is best for a powerlifting form check?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'For squat and deadlift: directly to the side in landscape mode, capturing the full lift from setup to lockout. For bench press: side angle showing bar path and arch. A second camera from the feet end helps assess knee tracking on squats.',
          },
        },
        {
          '@type': 'Question',
          name: 'How often should I do a form check?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'At minimum at the start of each training block, and when introducing a new technical cue. Weekly video review helps lock in a technique change before old patterns re-establish. Avoid filming only at maximal loads, since technique breaks down at max effort and the feedback is less useful.',
          },
        },
      ],
    },
  ],
};

export default function FormCheckPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPost
        title="Powerlifting Form Check: What Coaches Look For"
        date="June 2026"
        readTime="7 min read"
        category="TECHNIQUE"
      >
        <DefinitionBlock>
          A powerlifting form check is a video review of a squat, bench press, or deadlift to
          identify technical faults that reduce performance or increase injury risk. Coaches analyze
          bar path, body position, bracing, and movement sequencing frame by frame to give specific,
          actionable cues. The goal in powerlifting form is to move maximum weight within federation
          rules, not to hit a specific aesthetic.
        </DefinitionBlock>

        <P>
          Some positions that look unusual are mechanically optimal for a given body structure. A
          wide-stance squat with a more forward lean may be ideal for a lifter with long femurs;
          a steep upright torso for someone shorter. Form check cues should account for individual
          anatomy, not impose a single universal template.
        </P>

        <H2>Squat</H2>

        <H3>Setup and descent</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Cue point</Th>
              <Th>What coaches look for</Th>
              <Th>Common fault</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Bar position', 'Low bar or high bar, consistent with the lifter\'s style and anatomy', 'Bar creeping up during a set or between sessions'],
              ['Foot width', 'Stance that allows hip depth without grinding at the bottom', 'Too narrow to reach legal depth'],
              ['Brace', '360° intra-abdominal pressure ("big breath into the belly")', 'Chest breathing only, so rigidity is lost under load'],
              ['Descent', 'Controlled, consistent speed, not a collapse or a dive', 'Caving at the bottom or losing position on the way down'],
            ].map(([cue, look, fault]) => (
              <tr key={cue}>
                <Td highlight>{cue}</Td>
                <Td>{look}</Td>
                <Td>{fault}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H3>Bottom position and ascent</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Cue point</Th>
              <Th>What coaches look for</Th>
              <Th>Common fault</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Depth', 'Hip crease below the top of the knee (IPF standard)', '"High squats" that reach depth only at max weight'],
              ['Knee tracking', 'Knees track over toes, consistent with foot angle', 'Valgus collapse (knees caving in) at the sticking point'],
              ['Hip drive', 'Hips and bar rise together off the bottom', '"Good morning squat": hips rise first, bar tips forward'],
              ['Bar path', 'Vertical over mid-foot throughout the lift', 'Forward drift at the sticking point, lengthening the moment arm'],
            ].map(([cue, look, fault]) => (
              <tr key={cue}>
                <Td highlight>{cue}</Td>
                <Td>{look}</Td>
                <Td>{fault}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H2>Bench press</H2>

        <H3>Setup</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Cue point</Th>
              <Th>What coaches look for</Th>
              <Th>Common fault</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Arch', 'Thoracic arch creating a stable base and reducing the bar stroke', 'Flat back: longer stroke, less leg drive'],
              ['Shoulder blades', 'Retracted and depressed into a tight, stable shelf', 'Shrugged shoulders, so bar path drifts and stability drops'],
              ['Leg drive', 'Feet planted, driving force into the setup throughout the press', 'Feet floating or rising, so leg drive is lost'],
              ['Grip width', 'Competition-legal width (index finger at or inside the 81cm rings)', 'Too wide adds shoulder risk; too narrow adds tricep demand'],
            ].map(([cue, look, fault]) => (
              <tr key={cue}>
                <Td highlight>{cue}</Td>
                <Td>{look}</Td>
                <Td>{fault}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H3>Press</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Cue point</Th>
              <Th>What coaches look for</Th>
              <Th>Common fault</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Touch point', 'Lower chest / solar plexus, varying by anatomy and arch height', 'Touching too high, which lengthens the stroke'],
              ['Bar path', 'Slight J-curve: descends to chest, pressed back toward the rack at lockout', 'A straight vertical path, which adds shoulder moment'],
              ['Elbow angle', '45–75° from torso depending on arch and grip width', 'Elbows too flared (>90°), risking shoulder impingement'],
              ['Lockout', 'Both elbows locked simultaneously, hips on the bench', 'Uneven lockout or hips bridging off the bench'],
            ].map(([cue, look, fault]) => (
              <tr key={cue}>
                <Td highlight>{cue}</Td>
                <Td>{look}</Td>
                <Td>{fault}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H2>Deadlift</H2>

        <H3>Setup</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Cue point</Th>
              <Th>What coaches look for</Th>
              <Th>Common fault</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Bar position', 'Over mid-foot, about 1 inch from the shins', 'Bar too far forward, lengthening the lever arm off the floor'],
              ['Hip height', 'Hips set with tension, not squatted down or stood over the bar', 'Hips too high loads the lower back early; too low turns it into a squat'],
              ['Lat engagement', 'Lats engaged ("protect your armpits") before the bar leaves the floor', 'Slack lats let the bar swing away from the body during the pull'],
              ['Brace', 'Maximal brace established before the pull begins', 'Breathing during the pull or bracing after the bar breaks the floor'],
            ].map(([cue, look, fault]) => (
              <tr key={cue}>
                <Td highlight>{cue}</Td>
                <Td>{look}</Td>
                <Td>{fault}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H3>Pull and lockout</H3>
        <DataTable>
          <thead>
            <tr>
              <Th>Cue point</Th>
              <Th>What coaches look for</Th>
              <Th>Common fault</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Bar path', 'Vertical, with the bar dragging up the leg the entire pull', 'Bar swinging forward at any point, creating a massive moment arm'],
              ['Back angle', 'Neutral spine held throughout, no rounding under load', 'Lumbar rounding (especially off the floor) or thoracic rounding at the top'],
              ['Hip extension', 'Hips drive through at lockout, standing tall', 'Hyperextending backward at lockout, which isn\'t required and adds injury risk'],
              ['Lockout', 'Knees locked, hips fully extended, standing upright', 'Leaning too far back or soft knees at lockout, a no-lift in competition'],
            ].map(([cue, look, fault]) => (
              <tr key={cue}>
                <Td highlight>{cue}</Td>
                <Td>{look}</Td>
                <Td>{fault}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <H2>How Liftly's AI form check works</H2>
        <P>
          When you upload a training video in Liftly, the form check feature analyzes it frame by
          frame. It identifies bar path trajectory across the full range of motion, bracing stability
          through the torso, knee tracking on squats, and whether the lift achieves a legal lockout.
          The output is lift-specific cues in plain language, the same way a coach reads a set from
          the side.
        </P>

        <Callout>
          The Liftly form check is not a generic posture scorer. It understands the specific mechanics
          of powerlifting competition lifts: a squat is analyzed for depth relative to the knee, not
          an arbitrary range of motion. A deadlift lockout is assessed against competition standards,
          not general back angle.
        </Callout>

        <H2>How to film a form check video</H2>
        <Ul>
          <Li>Film in landscape mode with the full lift in frame from setup to lockout.</Li>
          <Li>For squat and deadlift: position the camera directly to the side at about hip height.</Li>
          <Li>For bench press: side angle showing bar path and arch. A second angle from the feet helps assess elbow position.</Li>
          <Li>Film at normal training weight (70–85% 1RM), not at maximal loads. Technique breaks down at near-max efforts, and that footage is less useful for technique work.</Li>
          <Li>Make sure lighting is adequate and the bar is visible against the background throughout.</Li>
        </Ul>

        <FAQSection>
          <FAQItem question="What is a form check in powerlifting?">
            A form check is a video review of a squat, bench press, or deadlift to identify technical
            faults. Coaches or AI systems analyze bar path, bracing, depth, knee tracking, and lockout
            to provide specific, actionable cues for improvement.
          </FAQItem>
          <FAQItem question="What camera angle is best for a powerlifting form check?">
            For squat and deadlift: directly to the side in landscape mode, capturing the full lift
            from setup to lockout. For bench press: side angle showing bar path and arch. A second
            camera from the feet end helps assess knee tracking on squats.
          </FAQItem>
          <FAQItem question="How often should I get a form check?">
            At minimum at the start of each training block. When learning a new technical cue, weekly
            video review helps lock in the change before old patterns re-establish. Avoid filming only
            at maximal loads, since technique breaks down at max effort and the feedback is less actionable.
          </FAQItem>
        </FAQSection>
      </BlogPost>
    </>
  );
}
