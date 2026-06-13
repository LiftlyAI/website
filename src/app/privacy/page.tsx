import type { Metadata } from 'next';
import { LegalLayout, Section, List } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy · Liftly',
  description: 'How Liftly collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      kicker="──── LEGAL ────"
      title="Privacy Policy"
      effectiveDate="June 13, 2026"
      intro="Liftly is an AI-powered powerlifting coaching service. This policy explains what we collect, why we collect it, who we share it with, and the choices you have. We try to keep it plain — no fluff."
    >
      <Section id="who-we-are" n="01" title="Who we are">
        <p>
          “Liftly,” “we,” “us,” and “our” refer to the operator of the Liftly application and website
          (the “Service”). For any privacy question, or to exercise the rights described below, contact
          us at <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>.
        </p>
        <p>
          For most of your data, Liftly is the “data controller” (we decide how and why it’s used). If
          you use Liftly through a coach who manages your account, your coach may also be a controller
          of the training data they review.
        </p>
      </Section>

      <Section id="what-we-collect" n="02" title="What we collect">
        <p>We collect the following, most of which you give us directly:</p>
        <List
          items={[
            <>
              <strong className="text-chalk">Account data.</strong> Your email address and
              authentication details used to create and secure your account.
            </>,
            <>
              <strong className="text-chalk">Profile &amp; onboarding data.</strong> Information you
              enter to calibrate your program — current maxes, training schedule, federation,
              experience level, weak points, and body metrics such as bodyweight, height, age, and
              sex (used to compute calorie and macro targets).
            </>,
            <>
              <strong className="text-chalk">Training logs.</strong> The sets, reps, loads, RPE
              ratings, and notes you record during sessions, plus derived metrics like estimated 1-rep
              max and tonnage.
            </>,
            <>
              <strong className="text-chalk">Readiness &amp; wellness check-ins.</strong> Optional
              self-reported sleep, energy, soreness, stress, and pain flags. This is health-related
              information that we treat with extra care (see “Sensitive data” below).
            </>,
            <>
              <strong className="text-chalk">Form-check media.</strong> Videos of your lifts that you
              upload for analysis, and the pose, bar-path, and timing data we derive from them.
            </>,
            <>
              <strong className="text-chalk">Nutrition data.</strong> Dietary restrictions and
              preferences you enter, and the calorie/macro targets and meal plans generated for you.
            </>,
            <>
              <strong className="text-chalk">Coaching messages.</strong> The content of chats you have
              with the AI coach, and notes a human coach adds to your account.
            </>,
            <>
              <strong className="text-chalk">Usage &amp; device data.</strong> Basic analytics about
              how you use the Service (pages visited, actions taken, approximate device/browser),
              collected to keep the Service running and improve it.
            </>,
            <>
              <strong className="text-chalk">Cookies.</strong> A session cookie that keeps you signed
              in. See “Cookies” below.
            </>,
          ]}
        />
      </Section>

      <Section id="sensitive-data" n="03" title="Sensitive (health-related) data">
        <p>
          Readiness check-ins, pain flags, body metrics, and dietary information can reveal details
          about your health. Where the law requires consent to process this kind of data, you provide
          that consent by choosing to enter it. You can skip the readiness check-ins entirely — the
          Service works without them — and you can delete this data at any time. We do not sell
          health-related data, and we do not use it for advertising.
        </p>
      </Section>

      <Section id="how-we-use" n="04" title="How we use your data">
        <List
          items={[
            <>To create your account and sign you in.</>,
            <>
              To generate and adapt your program, analyze your form-check videos, estimate effort
              (RPE), and produce nutrition targets and meal plans.
            </>,
            <>To power the AI coach chat and the coach console (when you use a human coach).</>,
            <>To show you progress charts and weekly reviews.</>,
            <>To maintain, secure, debug, and improve the Service.</>,
            <>
              To communicate with you about your account, important changes, or support requests.
            </>,
            <>To comply with legal obligations and enforce our Terms of Service.</>,
          ]}
        />
        <p>
          We do <strong className="text-chalk">not</strong> sell your personal data, and we do not use
          your content to train third-party foundation models for their own purposes (see below).
        </p>
      </Section>

      <Section id="ai" n="05" title="AI processing">
        <p>
          Core features rely on artificial intelligence. To provide them, we send relevant
          content — for example your training context, chat messages, or form-check analysis data — to
          our AI provider, <strong className="text-chalk">Anthropic</strong> (the Claude API), which
          processes it on our behalf to generate a response. We instruct our AI provider to process
          this data only to serve your request and not to use it to train their general models.
        </p>
        <p>
          AI output can be wrong, incomplete, or not suitable for you. It is informational and not a
          substitute for professional medical, nutritional, or coaching advice. See our{' '}
          <a href="/terms" className="text-blood hover:underline">Terms of Service</a> for the full
          disclaimer.
        </p>
      </Section>

      <Section id="sharing" n="06" title="Who we share data with">
        <p>
          We share data only as needed to run the Service. Our service providers (“subprocessors”)
          process data on our behalf under contract:
        </p>
        <List
          items={[
            <>
              <strong className="text-chalk">Anthropic</strong> — AI processing for program
              generation, form-check coaching, chat, and meal plans.
            </>,
            <>
              <strong className="text-chalk">Supabase</strong> — authentication and database hosting.
            </>,
            <>
              <strong className="text-chalk">Vercel</strong> — application hosting and privacy-focused
              usage analytics.
            </>,
            <>
              <strong className="text-chalk">Your coach.</strong> If you use Liftly through a coach,
              that coach can view your training data, readiness, form checks, and progress in order to
              advise you.
            </>,
          ]}
        />
        <p>
          We may also disclose data if required by law, to protect our rights or users’ safety, or in
          connection with a merger, acquisition, or sale of assets (you’ll be notified of any such
          change).
        </p>
      </Section>

      <Section id="retention" n="07" title="How long we keep it">
        <p>
          We keep your data for as long as your account is active. If you delete your account, we
          delete or anonymize your personal data within a reasonable period, except where we must keep
          certain records to meet legal, security, or accounting obligations. You can request deletion
          of specific items (such as form-check videos or readiness logs) at any time.
        </p>
      </Section>

      <Section id="security" n="08" title="Security">
        <p>
          We use reasonable technical and organizational measures — including encryption in transit,
          access controls, and trusted hosting providers — to protect your data. No system is perfectly
          secure, so we can’t guarantee absolute security, but we work to protect your information and
          will notify you of a breach where the law requires it.
        </p>
      </Section>

      <Section id="your-rights" n="09" title="Your rights and choices">
        <p>
          Depending on where you live, you may have the right to access, correct, export, or delete
          your personal data, to object to or restrict certain processing, and to withdraw consent.
          You can do much of this from within the app, or by emailing{' '}
          <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>.
          We won’t discriminate against you for exercising these rights. If you’re in the EEA/UK, you
          also have the right to complain to your local data protection authority.
        </p>
      </Section>

      <Section id="cookies" n="10" title="Cookies">
        <p>
          We use a small number of cookies that are essential to the Service — primarily a session
          cookie that keeps you signed in — and privacy-focused analytics that help us understand usage
          in aggregate. We do not use cookies for cross-site advertising. You can control cookies
          through your browser settings, though disabling essential cookies will prevent you from
          signing in.
        </p>
      </Section>

      <Section id="international" n="11" title="International transfers">
        <p>
          We and our providers may process your data in countries other than your own, including the
          United States. Where required, we rely on appropriate safeguards (such as standard
          contractual clauses) to protect your data when it’s transferred internationally.
        </p>
      </Section>

      <Section id="children" n="12" title="Children">
        <p>
          The Service involves heavy strength training and health-related data and is intended for
          adults. It is not directed to children under 16, and we do not knowingly collect their data.
          If you believe a child has provided us personal data, contact us and we’ll delete it.
        </p>
      </Section>

      <Section id="changes" n="13" title="Changes to this policy">
        <p>
          We may update this policy as the Service evolves. When we make material changes, we’ll update
          the “Effective” date above and, where appropriate, notify you in the app or by email. Your
          continued use of the Service after an update means you accept the revised policy.
        </p>
      </Section>
    </LegalLayout>
  );
}
