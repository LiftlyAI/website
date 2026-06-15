import type { Metadata } from 'next';
import { LegalLayout, Section, List } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service · Liftly',
  description: 'The terms that govern your use of Liftly.',
};

export default function TermsPage() {
  return (
    <LegalLayout
      kicker="──── LEGAL ────"
      title="Terms of Service"
      effectiveDate="June 13, 2026"
      intro="These terms are a contract between you and Liftly. By creating an account or using the Service, you agree to them. Read the health and AI disclaimers in Sections 03 and 04, and the arbitration and class-action waiver in Section 17, carefully: strength training carries real risk, and Section 17 affects how disputes are resolved."
    >
      <Section id="acceptance" n="01" title="Acceptance of these terms">
        <p>
          By accessing or using Liftly (the “Service”), you agree to these Terms of Service and to our{' '}
          <a href="/privacy" className="text-blood hover:underline">Privacy Policy</a>. If you do not
          agree, do not use the Service. If you use the Service on behalf of an organization, for example
          as a coach, you represent that you have authority to bind that organization to these terms.
        </p>
      </Section>

      <Section id="eligibility" n="02" title="Who can use Liftly">
        <p>
          You must be at least 16 years old, and ideally an adult, to use the Service, and you must be
          able to form a binding contract under the law that applies to you. Because the Service involves
          heavy strength training, you confirm that you are physically able to exercise and have no medical
          condition that makes training unsafe. If you are unsure, consult a physician before starting.
        </p>
      </Section>

      <Section id="health-disclaimer" n="03" title="Health and safety disclaimer — read this">
        <p>
          Liftly is a fitness and information tool, <strong className="text-chalk">not</strong> a medical
          service. It does not provide medical, physical-therapy, or professional nutritional advice,
          diagnosis, or treatment, and nothing in the Service should be treated as such.
        </p>
        <List
          items={[
            <>
              <strong className="text-chalk">You train at your own risk.</strong> Powerlifting and
              resistance training carry an inherent risk of serious injury or death. You assume that
              risk and are solely responsible for your training decisions.
            </>,
            <>
              <strong className="text-chalk">Programs and macros are suggestions.</strong> Loads, RPE
              targets, taper plans, calories, and meal plans are estimates generated from the data you
              provide. Use your own judgment, listen to your body, and stop if something hurts.
            </>,
            <>
              <strong className="text-chalk">Get sharp pain checked.</strong> The Service does not replace
              a doctor or physical therapist. Seek professional care for injuries, pain, or any health
              concern before continuing.
            </>,
            <>
              <strong className="text-chalk">Consult a professional</strong> before starting any new
              training or nutrition program, especially if you are pregnant, have a medical condition,
              or take medication.
            </>,
          ]}
        />
      </Section>

      <Section id="ai-disclaimer" n="04" title="About the AI">
        <p>
          Core features are powered by artificial intelligence. AI can produce output that is inaccurate,
          incomplete, or inappropriate for your situation, including incorrect RPE estimates, form
          feedback, or nutrition figures. AI output is for general information only and is not professional
          advice. Apply your own judgment, and do not rely on the Service for decisions that could affect
          your health or safety without independent verification.
        </p>
      </Section>

      <Section id="accounts" n="05" title="Your account">
        <p>
          You are responsible for the accuracy of the information you provide and for keeping your account
          credentials secure. You are responsible for all activity under your account. Notify us at{' '}
          <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>{' '}
          if you suspect unauthorized use.
        </p>
      </Section>

      <Section id="acceptable-use" n="06" title="Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            <>Use the Service for any unlawful purpose or in violation of these terms.</>,
            <>
              Upload content you do not have the right to share, or media containing people who have not
              consented to being filmed and analyzed.
            </>,
            <>
              Attempt to reverse-engineer, scrape, overload, or interfere with the Service or its
              underlying systems and providers.
            </>,
            <>
              Resell, sublicense, or build a competing product from the Service or its output without
              our permission.
            </>,
            <>Misrepresent your identity or impersonate others, including coaches or clients.</>,
          ]}
        />
      </Section>

      <Section id="your-content" n="07" title="Your content">
        <p>
          You keep ownership of the content you submit: your training logs, videos, messages, and other
          data (“Your Content”). You grant Liftly a limited, non-exclusive, worldwide, royalty-free license
          to host, process, and display Your Content solely to operate and improve the Service for you,
          including sending it to our AI, compute, and infrastructure providers as described in the{' '}
          <a href="/privacy" className="text-blood hover:underline">Privacy Policy</a>. You are responsible
          for Your Content and confirm you have the rights necessary to submit it.
        </p>
      </Section>

      <Section id="coaches" n="08" title="Coaches and clients">
        <p>
          If you use Liftly as a coach, you may view and act on data your clients share with you, and you
          are responsible for using that data appropriately, lawfully, and only to coach them. A coach is
          an independent controller of client data they review and is responsible for the advice they give.
          AI may draft adjustments, but a coach reviews and approves changes that require sign-off. If you
          are an athlete working with a coach, you acknowledge your coach can access your training data.
        </p>
      </Section>

      <Section id="ip" n="09" title="Our intellectual property">
        <p>
          The Service, including its software, design, text, logos, and the “Liftly” name, is owned by us
          and protected by intellectual-property laws. We grant you a limited, non-exclusive,
          non-transferable, revocable license to use the Service for your personal use or, for coaches,
          internal coaching use. We reserve all rights not expressly granted.
        </p>
      </Section>

      <Section id="dmca" n="10" title="Copyright and DMCA notices">
        <p>
          We respect intellectual-property rights and respond to notices under the Digital Millennium
          Copyright Act (17 U.S.C. §512) and equivalent laws such as Article 17 of the EU Copyright
          Directive (Directive (EU) 2019/790). If you believe content on the Service infringes your
          copyright, send a notice to{' '}
          <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>{' '}
          that identifies the work, the material, your contact details, a good-faith statement, and a
          statement under penalty of perjury that you are authorized to act. We will remove infringing
          material and may terminate repeat infringers.
        </p>
      </Section>

      <Section id="payment" n="11" title="Plans and payment">
        <p>
          Liftly may offer free and paid features. If you purchase a paid plan, you agree to the prices and
          billing terms presented at checkout. Fees are charged in advance and, except where the law
          requires otherwise, are non-refundable. We may change pricing prospectively with notice; changes
          will not affect a billing period you have already paid for. Consumers in the EEA and the UK who
          buy a digital subscription have a statutory right of withdrawal within 14 days under the Consumer
          Rights Directive (2011/83/EU) and the Consumer Contracts Regulations 2013, subject to the
          exceptions in those laws.
        </p>
      </Section>

      <Section id="third-party" n="12" title="Third-party services">
        <p>
          The Service relies on third parties, including Anthropic, PBC for AI, Modal Labs, Inc. for the
          compute that runs our form-check analysis, Supabase, Inc. for authentication and data hosting,
          and Vercel, Inc. for application hosting, and may link to third-party sites. We are not
          responsible for third-party services or content, and your use of them may be governed by their
          own terms.
        </p>
      </Section>

      <Section id="termination" n="13" title="Suspension and termination">
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or terminate
          your access if you violate these terms, create risk or legal exposure, or if we discontinue the
          Service. Sections that by their nature should survive termination, including the disclaimers,
          limitation of liability, indemnification, and dispute-resolution provisions, will continue to
          apply.
        </p>
      </Section>

      <Section id="warranty" n="14" title="Disclaimer of warranties">
        <p>
          The Service is provided “as is” and “as available,” without warranties of any kind, whether
          express or implied, including merchantability, fitness for a particular purpose, accuracy, and
          non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that
          AI output will be accurate or suitable for you. Some jurisdictions do not allow certain
          disclaimers, and consumer-protection laws such as the Australian Consumer Law and the EU and UK
          consumer-rights regimes grant guarantees that these terms do not exclude, so some of the above
          may not apply to you.
        </p>
      </Section>

      <Section id="liability" n="15" title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Liftly and its operators will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or for any personal injury,
          loss of data, or lost profits, arising out of or relating to your use of (or inability to use)
          the Service, including any reliance on AI output or training and nutrition suggestions. Our total
          liability for any claim relating to the Service will not exceed the greater of the amount you paid
          us in the 12 months before the claim or USD $100. Nothing in these terms limits liability that
          cannot be limited by law, including liability for death or personal injury caused by negligence,
          for fraud, or under non-excludable consumer guarantees. Some jurisdictions do not allow these
          limits, so they may not fully apply to you.
        </p>
      </Section>

      <Section id="indemnity" n="16" title="Indemnification">
        <p>
          You agree to indemnify and hold harmless Liftly and its operators from claims, damages, and
          expenses (including reasonable legal fees) arising from Your Content, your use of the Service, or
          your violation of these terms or any law or third-party right. This Section does not apply to the
          extent a mandatory consumer-protection law in your jurisdiction prohibits it.
        </p>
      </Section>

      <Section id="dispute" n="17" title="Arbitration and class-action waiver">
        <p>
          If you are in the United States, you and Liftly agree to resolve any dispute relating to the
          Service through binding individual arbitration under the Federal Arbitration Act (9 U.S.C. §1 et
          seq.), administered by a recognized arbitration provider, rather than in court, except that
          either party may bring a claim in small-claims court or seek injunctive relief for intellectual-
          property misuse. <strong className="text-chalk">You and Liftly waive any right to a jury trial
          and to participate in a class or representative action.</strong> You may opt out of this
          arbitration agreement by emailing us within 30 days of first accepting these terms.
        </p>
        <p>
          This Section does not apply where binding arbitration or class-action waivers are unenforceable.
          Consumers in the EEA, the UK, and other jurisdictions keep the right to bring proceedings in
          their local courts and to use any official dispute-resolution or online-dispute-resolution
          mechanism the law provides.
        </p>
      </Section>

      <Section id="law" n="18" title="Governing law">
        <p>
          These terms are governed by the laws of the jurisdiction in which Liftly’s operator is
          established, without regard to conflict-of-laws rules. You agree to resolve disputes in the courts
          of that jurisdiction, subject to Section 17 and to any mandatory local law that gives a consumer
          the right to bring a claim in their home courts or to the protection of the consumer laws of their
          place of residence. Before filing anything, please contact us; most issues can be resolved by
          email.
        </p>
      </Section>

      <Section id="export" n="19" title="Export controls and sanctions">
        <p>
          You may not use the Service in violation of U.S. export-control and sanctions laws administered by
          the Office of Foreign Assets Control and the Bureau of Industry and Security, or comparable EU and
          UK regimes. You represent that you are not located in, and are not a national of, a country or
          group subject to a comprehensive embargo, and that you are not on any restricted-party list.
        </p>
      </Section>

      <Section id="changes" n="20" title="Changes to these terms">
        <p>
          We may update these terms as the Service evolves. When changes are material, we will update the
          “Effective” date above and, where appropriate, notify you in the app or by email. Continuing to
          use the Service after changes take effect means you accept the revised terms.
        </p>
      </Section>

      <Section id="contact" n="21" title="Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
