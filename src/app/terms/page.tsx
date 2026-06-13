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
      intro="These terms are a contract between you and Liftly. By creating an account or using the Service, you agree to them. Please read the health and AI disclaimers carefully — strength training carries real risk."
    >
      <Section id="acceptance" n="01" title="Acceptance of these terms">
        <p>
          By accessing or using Liftly (the “Service”), you agree to these Terms of Service and to our{' '}
          <a href="/privacy" className="text-blood hover:underline">Privacy Policy</a>. If you do not
          agree, do not use the Service. If you use the Service on behalf of an organization (for
          example as a coach), you represent that you have authority to bind that organization to these
          terms.
        </p>
      </Section>

      <Section id="eligibility" n="02" title="Who can use Liftly">
        <p>
          You must be at least 16 years old, and ideally an adult, to use the Service, and you must be
          able to form a binding contract. Because the Service involves heavy strength training, you
          confirm that you are physically able to exercise and have no medical condition that makes
          training unsafe. If you’re unsure, consult a physician before starting.
        </p>
      </Section>

      <Section id="health-disclaimer" n="03" title="Health &amp; safety disclaimer — read this">
        <p>
          Liftly is a fitness and information tool, <strong className="text-chalk">not</strong> a
          medical service. It does not provide medical, physical-therapy, or professional nutritional
          advice, diagnosis, or treatment, and nothing in the Service should be treated as such.
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
              <strong className="text-chalk">Get sharp pain checked.</strong> The Service is not a
              substitute for a doctor or physical therapist. Seek professional care for injuries, pain,
              or any health concern before continuing.
            </>,
            <>
              <strong className="text-chalk">Consult a professional</strong> before starting any new
              training or nutrition program, especially if you’re pregnant, have a medical condition,
              or take medication.
            </>,
          ]}
        />
      </Section>

      <Section id="ai-disclaimer" n="04" title="About the AI">
        <p>
          Core features are powered by artificial intelligence. AI can produce output that is
          inaccurate, incomplete, or inappropriate for your situation — including incorrect RPE
          estimates, form feedback, or nutrition figures. AI output is for general information only and
          is not professional advice. Always apply your own judgment, and don’t rely on the Service for
          decisions that could affect your health or safety without independent verification.
        </p>
      </Section>

      <Section id="accounts" n="05" title="Your account">
        <p>
          You’re responsible for the accuracy of the information you provide and for keeping your
          account credentials secure. You’re responsible for all activity under your account. Notify us
          promptly at{' '}
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
              Upload content you don’t have the right to share, or media containing people who haven’t
              consented to being filmed and analyzed.
            </>,
            <>
              Attempt to reverse-engineer, scrape, overload, or interfere with the Service or its
              underlying systems and AI providers.
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
          You keep ownership of the content you submit — your training logs, videos, messages, and
          other data (“Your Content”). You grant Liftly a limited, non-exclusive license to host,
          process, and display Your Content solely to operate and improve the Service for you,
          including sending it to our AI and infrastructure providers as described in the{' '}
          <a href="/privacy" className="text-blood hover:underline">Privacy Policy</a>. You are
          responsible for Your Content and confirm you have the rights necessary to submit it.
        </p>
      </Section>

      <Section id="coaches" n="08" title="Coaches and clients">
        <p>
          If you use Liftly as a coach, you may view and act on data your clients share with you, and
          you’re responsible for using that data appropriately, lawfully, and only to coach them. AI
          may draft adjustments, but a coach reviews and approves changes that require sign-off — you
          remain responsible for the advice you give. If you’re an athlete working with a coach, you
          acknowledge your coach can access your training data.
        </p>
      </Section>

      <Section id="ip" n="09" title="Our intellectual property">
        <p>
          The Service — including its software, design, text, logos, and the “Liftly” name — is owned by
          us and protected by intellectual-property laws. We grant you a limited, non-exclusive,
          non-transferable, revocable license to use the Service for your personal (or, for coaches,
          internal coaching) use. We reserve all rights not expressly granted.
        </p>
      </Section>

      <Section id="payment" n="10" title="Plans and payment">
        <p>
          Liftly may offer free and paid features. If you purchase a paid plan, you agree to the prices
          and billing terms presented at checkout. Fees are charged in advance and, except where
          required by law, are non-refundable. We may change pricing prospectively with notice; changes
          won’t affect a billing period you’ve already paid for.
        </p>
      </Section>

      <Section id="third-party" n="11" title="Third-party services">
        <p>
          The Service relies on third parties (such as our AI, hosting, and authentication providers)
          and may link to third-party sites. We aren’t responsible for third-party services or
          content, and your use of them may be governed by their own terms.
        </p>
      </Section>

      <Section id="termination" n="12" title="Suspension and termination">
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or
          terminate your access if you violate these terms, create risk or legal exposure, or if we
          discontinue the Service. Sections that by their nature should survive termination — including
          disclaimers, limitation of liability, and indemnification — will continue to apply.
        </p>
      </Section>

      <Section id="warranty" n="13" title="Disclaimer of warranties">
        <p>
          The Service is provided “as is” and “as available,” without warranties of any kind, whether
          express or implied, including merchantability, fitness for a particular purpose, accuracy,
          and non-infringement. We do not warrant that the Service will be uninterrupted, error-free,
          or that AI output will be accurate or suitable for you. Some jurisdictions don’t allow
          certain disclaimers, so some of the above may not apply to you.
        </p>
      </Section>

      <Section id="liability" n="14" title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Liftly and its operators will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or for any personal
          injury, loss of data, or lost profits, arising out of or relating to your use of (or
          inability to use) the Service — including any reliance on AI output or training/nutrition
          suggestions. Our total liability for any claim relating to the Service will not exceed the
          greater of the amount you paid us in the 12 months before the claim or USD $100. Some
          jurisdictions don’t allow these limits, so they may not fully apply to you.
        </p>
      </Section>

      <Section id="indemnity" n="15" title="Indemnification">
        <p>
          You agree to indemnify and hold harmless Liftly and its operators from claims, damages, and
          expenses (including reasonable legal fees) arising from Your Content, your use of the
          Service, or your violation of these terms or any law or third-party right.
        </p>
      </Section>

      <Section id="law" n="16" title="Governing law &amp; disputes">
        <p>
          These terms are governed by the laws of the jurisdiction in which Liftly’s operator is
          established, without regard to conflict-of-laws rules. You agree to resolve disputes in the
          courts of that jurisdiction, unless mandatory local law gives you the right to bring a claim
          elsewhere. Before filing anything, please contact us — most issues can be resolved by email.
        </p>
      </Section>

      <Section id="changes" n="17" title="Changes to these terms">
        <p>
          We may update these terms as the Service evolves. When changes are material, we’ll update the
          “Effective” date above and, where appropriate, notify you in the app or by email. Continuing
          to use the Service after changes take effect means you accept the revised terms.
        </p>
      </Section>

      <Section id="contact" n="18" title="Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:liftlysupport@gmail.com" className="text-blood hover:underline">liftlysupport@gmail.com</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
