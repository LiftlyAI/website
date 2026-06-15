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
      intro="Liftly is an AI-powered powerlifting coaching service. This policy explains what we collect, the legal grounds we rely on, who processes it for us, how long we keep it, and the rights you hold under the privacy laws that apply to you. Defined terms carry the meaning given in the data-protection statutes cited below."
    >
      <Section id="who-we-are" n="01" title="Who we are">
        <p>
          “Liftly,” “we,” “us,” and “our” refer to the operator of the Liftly application and website
          (the “Service”). For any privacy request, or to exercise the rights described below, contact
          us at <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>.
        </p>
        <p>
          For most of your data, Liftly is the “controller” within the meaning of Article 4(7) of the
          EU General Data Protection Regulation (Regulation (EU) 2016/679, the “GDPR”) and the equivalent
          “business” under the California Consumer Privacy Act as amended by the California Privacy Rights
          Act (Cal. Civ. Code §1798.100 et seq., the “CCPA/CPRA”). We decide how and why your data is
          used. If you use Liftly through a coach who manages your account, that coach acts as an
          independent controller of the training data they review, and their own privacy practices govern
          that review.
        </p>
      </Section>

      <Section id="scope-and-law" n="02" title="Scope and the laws that apply">
        <p>
          This policy covers personal data we process about users of the Service worldwide. Your location
          determines which statute grants you rights. We have built this policy to meet the requirements
          of, among others:
        </p>
        <List
          items={[
            <>
              <strong className="text-chalk">European Economic Area:</strong> the GDPR and the ePrivacy
              Directive (2002/58/EC) as implemented in your member state.
            </>,
            <>
              <strong className="text-chalk">United Kingdom:</strong> the UK GDPR and the Data Protection
              Act 2018, together with the Privacy and Electronic Communications Regulations 2003.
            </>,
            <>
              <strong className="text-chalk">United States:</strong> the CCPA/CPRA in California, the
              Virginia Consumer Data Protection Act (Va. Code §59.1-575 et seq.), the Colorado Privacy Act
              (C.R.S. §6-1-1301 et seq.), the Connecticut Data Privacy Act, the Utah Consumer Privacy Act,
              and comparable state statutes as they take effect; the Children’s Online Privacy Protection
              Act (15 U.S.C. §6501 et seq., “COPPA”); and, where they apply to wellness records, state
              health-data laws such as Washington’s My Health My Data Act.
            </>,
            <>
              <strong className="text-chalk">Canada:</strong> the Personal Information Protection and
              Electronic Documents Act (“PIPEDA”) and substantially similar provincial laws.
            </>,
            <>
              <strong className="text-chalk">Brazil:</strong> the Lei Geral de Proteção de Dados (Law No.
              13.709/2018, “LGPD”).
            </>,
            <>
              <strong className="text-chalk">Australia:</strong> the Privacy Act 1988 (Cth) and the
              Australian Privacy Principles.
            </>,
          ]}
        />
        <p>
          Where two regimes conflict, we apply the standard that gives you the stronger protection. Our
          use of AI follows the transparency duties of the EU Artificial Intelligence Act (Regulation (EU)
          2024/1689) for the features it governs.
        </p>
      </Section>

      <Section id="not-hipaa" n="03" title="A note on health regulation">
        <p>
          Liftly is a consumer fitness product. We are not a “covered entity” or a “business associate”
          under the U.S. Health Insurance Portability and Accountability Act (“HIPAA”), and the wellness
          data you enter is not protected health information under that statute. Health-related data you
          give us is, however, “special category data” under Article 9 of the GDPR and “sensitive personal
          information” under the CCPA/CPRA, and we handle it under the heightened rules described below.
        </p>
      </Section>

      <Section id="what-we-collect" n="04" title="What we collect">
        <p>We collect the following, most of which you give us directly:</p>
        <List
          items={[
            <>
              <strong className="text-chalk">Account data.</strong> Your email address and
              authentication details used to create and secure your account.
            </>,
            <>
              <strong className="text-chalk">Profile and onboarding data.</strong> Information you
              enter to calibrate your program: current maxes, training schedule, federation,
              experience level, weak points, and body metrics such as bodyweight, height, age, and
              sex (used to compute calorie and macro targets).
            </>,
            <>
              <strong className="text-chalk">Training logs.</strong> The sets, reps, loads, RPE
              ratings, and notes you record during sessions, plus derived metrics like estimated 1-rep
              max and tonnage.
            </>,
            <>
              <strong className="text-chalk">Readiness and wellness check-ins.</strong> Optional
              self-reported sleep, energy, soreness, stress, and pain flags. This is health-related
              information that we treat as special category data (see Section 03 and Section 06).
            </>,
            <>
              <strong className="text-chalk">Form-check media.</strong> Videos of your lifts that you
              upload for analysis, and the pose, bar-path, and timing data we derive from them. Video can
              reveal your likeness and, in some jurisdictions, biometric identifiers.
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
              <strong className="text-chalk">Usage and device data.</strong> Analytics about how you use
              the Service (pages visited, actions taken, approximate device and browser), collected to
              keep the Service running and to improve it.
            </>,
            <>
              <strong className="text-chalk">Cookies.</strong> A session cookie that keeps you signed
              in. See Section 13.
            </>,
          ]}
        />
      </Section>

      <Section id="sensitive-data" n="05" title="Sensitive (health-related) data">
        <p>
          Readiness check-ins, pain flags, body metrics, and dietary information can reveal details
          about your health. Article 9(1) of the GDPR prohibits processing this category of data unless
          an exception in Article 9(2) applies. We rely on your explicit consent under Article 9(2)(a),
          which you give by choosing to enter the data, and you may withdraw that consent at any time. The
          CCPA/CPRA gives you the right to limit our use of sensitive personal information, though we
          already confine that use to running the Service.
        </p>
        <p>
          The readiness check-ins are optional. The Service works without them, and you can delete this
          data whenever you want. We do not sell health-related data, we do not share it for cross-context
          behavioral advertising, and we do not use it for advertising of any kind.
        </p>
      </Section>

      <Section id="legal-bases" n="06" title="Why we are allowed to process your data">
        <p>
          For users in the EEA, the UK, and other jurisdictions that require a lawful basis, we rely on
          the grounds in Article 6(1) of the GDPR:
        </p>
        <List
          items={[
            <>
              <strong className="text-chalk">Contract (Art. 6(1)(b)).</strong> To create your account,
              generate and adapt your program, analyze your form-check videos, run the AI coach, and
              deliver the features you ask for.
            </>,
            <>
              <strong className="text-chalk">Consent (Art. 6(1)(a) and Art. 9(2)(a)).</strong> To process
              health-related readiness data and to set non-essential cookies, where consent is required.
            </>,
            <>
              <strong className="text-chalk">Legitimate interests (Art. 6(1)(f)).</strong> To secure,
              debug, and improve the Service and to prevent abuse, balanced against your rights. You may
              object to this processing under Article 21.
            </>,
            <>
              <strong className="text-chalk">Legal obligation (Art. 6(1)(c)).</strong> To meet tax,
              accounting, and other duties the law imposes on us.
            </>,
          ]}
        />
      </Section>

      <Section id="how-we-use" n="07" title="How we use your data">
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
          your content to train any third party’s general-purpose foundation models. Our contracts with
          our AI providers prohibit them from doing so.
        </p>
      </Section>

      <Section id="ai" n="08" title="AI processing">
        <p>
          Core features rely on artificial intelligence. To provide them, we send relevant content, for
          example your training context, chat messages, or form-check analysis data, to our AI provider{' '}
          <strong className="text-chalk">Anthropic, PBC</strong> (the Claude API), which processes it on
          our behalf to generate a response. We instruct Anthropic to process this data only to serve your
          request and not to train its general models, consistent with Anthropic’s commercial terms.
        </p>
        <p>
          Form-check video analysis runs on a computer-vision service we host on{' '}
          <strong className="text-chalk">Modal</strong> (Modal Labs, Inc.), a serverless compute platform.
          Your uploaded clip and the pose data derived from it are processed on Modal’s infrastructure to
          return the bar-path, timing, and form output, then handled under our retention rules in Section
          10. Modal acts as our processor and does not use your content for its own purposes.
        </p>
        <p>
          Article 22 of the GDPR gives you the right not to be subject to a decision based solely on
          automated processing that produces legal or similarly significant effects. The Service produces
          training and nutrition suggestions, not decisions of that kind, and a human coach reviews
          adjustments that require sign-off. AI output can be wrong, incomplete, or unsuitable for you. It
          is informational and does not replace professional medical, nutritional, or coaching advice. See
          our <a href="/terms" className="text-blood hover:underline">Terms of Service</a> for the full
          disclaimer.
        </p>
      </Section>

      <Section id="sharing" n="09" title="Who we share data with">
        <p>
          We share data only as needed to run the Service. Our service providers (“processors” under the
          GDPR, “service providers” under the CCPA/CPRA) process data on our behalf under written contracts
          that meet Article 28 of the GDPR:
        </p>
        <List
          items={[
            <>
              <strong className="text-chalk">Anthropic, PBC</strong> — AI processing for program
              generation, form-check coaching, chat, and meal plans.
            </>,
            <>
              <strong className="text-chalk">Modal Labs, Inc.</strong> — serverless compute that runs our
              form-check computer-vision analysis on uploaded video.
            </>,
            <>
              <strong className="text-chalk">Supabase, Inc.</strong> — authentication and database hosting.
            </>,
            <>
              <strong className="text-chalk">Vercel, Inc.</strong> — application hosting and
              privacy-focused usage analytics.
            </>,
            <>
              <strong className="text-chalk">Your coach.</strong> If you use Liftly through a coach,
              that coach can view your training data, readiness, form checks, and progress in order to
              advise you, and acts as an independent controller of what they review.
            </>,
          ]}
        />
        <p>
          We may also disclose data when the law requires it, to respond to a valid legal process, to
          protect our rights or users’ safety, or in connection with a merger, acquisition, or sale of
          assets, in which case we will notify you and the successor will be bound by this policy.
        </p>
      </Section>

      <Section id="international" n="10" title="International transfers">
        <p>
          We and our providers process your data in countries other than your own, including the United
          States, where Anthropic, Modal, Supabase, and Vercel operate. When we move personal data out of
          the EEA, we rely on the European Commission’s Standard Contractual Clauses (Commission
          Implementing Decision (EU) 2021/914) or an adequacy decision under Article 45 of the GDPR. For
          transfers out of the UK we use the UK International Data Transfer Agreement or the UK Addendum to
          the Standard Contractual Clauses issued under section 119A of the Data Protection Act 2018. You
          can request a copy of the safeguard we rely on by emailing us.
        </p>
      </Section>

      <Section id="retention" n="11" title="How long we keep it">
        <p>
          We keep your data for as long as your account is active. If you delete your account, we delete
          or anonymize your personal data within 90 days, except where we must keep certain records to meet
          legal, security, tax, or accounting obligations, in which case we keep only what the relevant law
          requires and for no longer than it requires. You can request deletion of specific items, such as
          form-check videos or readiness logs, at any time.
        </p>
      </Section>

      <Section id="security" n="12" title="Security">
        <p>
          We use technical and organizational measures appropriate to the risk under Article 32 of the
          GDPR, including encryption in transit, access controls, and vetted hosting providers, to protect
          your data. No system is perfectly secure, so we cannot guarantee absolute security. If a breach
          occurs, we will notify the competent supervisory authority within 72 hours where Article 33
          requires it, notify affected users where Article 34 or applicable U.S. state breach-notification
          laws require it, and take the steps the law sets out.
        </p>
      </Section>

      <Section id="your-rights" n="13" title="Your rights and choices">
        <p>
          Your rights depend on where you live. You can exercise any of them from within the app or by
          emailing{' '}
          <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>.
          We verify your identity before acting and respond within the period the relevant law sets. We
          will not discriminate against you for exercising these rights.
        </p>
        <p>
          <strong className="text-chalk">EEA and UK (GDPR, Articles 15–22).</strong> You may access,
          correct, erase, and port your data, restrict or object to processing, and withdraw consent
          without affecting prior processing. You may lodge a complaint with your local supervisory
          authority or, in the UK, the Information Commissioner’s Office.
        </p>
        <p>
          <strong className="text-chalk">California (CCPA/CPRA).</strong> You may know what we collect,
          access and delete it, correct it, opt out of any sale or sharing (we do neither), and limit the
          use of sensitive personal information. You may use an authorized agent and an opt-out preference
          signal such as Global Privacy Control.
        </p>
        <p>
          <strong className="text-chalk">Other U.S. states, Canada, Brazil, and Australia.</strong> Virginia,
          Colorado, Connecticut, Utah, and similar laws give you access, correction, deletion, portability,
          and opt-out rights, including an appeal if we decline a request. PIPEDA, the LGPD, and the
          Australian Privacy Principles grant comparable access and correction rights.
        </p>
      </Section>

      <Section id="cookies" n="14" title="Cookies">
        <p>
          We use a small number of cookies that are essential to the Service, mainly a session cookie that
          keeps you signed in, and privacy-focused analytics that help us understand usage in aggregate.
          We do not use cookies for cross-site advertising. Where the ePrivacy Directive or the UK PECR
          require consent for non-essential cookies, we ask for it before setting them. You can control
          cookies through your browser settings, though disabling essential cookies will prevent you from
          signing in.
        </p>
      </Section>

      <Section id="children" n="15" title="Children">
        <p>
          The Service involves heavy strength training and health-related data and is built for adults. It
          is not directed to children under 16, and we do not knowingly collect data from anyone under 13
          in the United States (COPPA) or under the digital-consent age set by your member state under
          Article 8 of the GDPR. If you believe a child has given us personal data, contact us and we will
          delete it.
        </p>
      </Section>

      <Section id="contact" n="16" title="Contact and complaints">
        <p>
          Reach our privacy team at{' '}
          <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>.
          If you are in the EEA or the UK and we have not resolved your concern, you may contact your
          supervisory authority. We will name an Article 27 GDPR representative where one is legally
          required and publish their details here.
        </p>
      </Section>

      <Section id="changes" n="17" title="Changes to this policy">
        <p>
          We may update this policy as the Service evolves. When we make material changes, we will update
          the “Effective” date above and, where appropriate, notify you in the app or by email. Your
          continued use of the Service after an update means you accept the revised policy.
        </p>
      </Section>
    </LegalLayout>
  );
}
