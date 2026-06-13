import { Metadata } from 'next';
import Link from 'next/link';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy policy for Liftly — how we collect, use, and protect your personal information.',
  openGraph: {
    title: 'Privacy Policy · Liftly',
    description:
      'Privacy policy for Liftly — how we collect, use, and protect your personal information.',
    url: 'https://liftly.tech/privacy',
  },
};

const SUPPORT_EMAIL = 'liftlysupport@gmail.com';

function Section({ id, number, title }: { id: string; number: string; title: string }) {
  return (
    <h2 id={id} className="mt-12 mb-4 font-display text-lg font-semibold uppercase tracking-wide text-chalk">
      {number}. {title}
    </h2>
  );
}

function Sub({ title }: { title: string }) {
  return <h3 className="mt-6 mb-3 font-display text-base font-semibold text-chalk">{title}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-relaxed text-chalk-dim">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mb-4 list-disc pl-6 space-y-1 text-chalk-dim leading-relaxed">{children}</ul>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-blood underline-offset-2 hover:underline">
      {children}
    </a>
  );
}

function InternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-blood underline-offset-2 hover:underline">
      {children}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-iron-800 bg-iron-950/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-chalk transition-colors hover:text-blood-glow">
            <LiftlyLogo size={26} />
          </Link>
          <Link href="/login" className="btn-primary !min-h-[36px] !px-4 !py-2 !text-xs">
            Start Lifting →
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28 font-body text-sm">
        {/* Title */}
        <div className="mb-10">
          <p className="page-kicker mb-2">// LEGAL</p>
          <h1 className="stencil-heading text-4xl text-chalk md:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-chalk-mute">Last updated June 13, 2026</p>
        </div>

        {/* Intro */}
        <P>
          This Privacy Notice for <strong className="text-chalk">Liftly</strong> (&quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) describes how and why we might access, collect, store,
          use, and/or share (&quot;process&quot;) your personal information when you use our services
          (&quot;Services&quot;), including when you:
        </P>
        <Ul>
          <Li>
            Visit our website at{' '}
            <A href="https://www.liftly.tech">https://www.liftly.tech</A> or any website of ours
            that links to this Privacy Notice
          </Li>
          <Li>Use Liftly, our AI powerlifting coaching application</Li>
          <Li>Engage with us in other related ways, including any marketing or events</Li>
        </Ul>
        <P>
          <strong className="text-chalk">Questions or concerns?</strong> Reading this Privacy Notice
          will help you understand your privacy rights and choices. We are responsible for making
          decisions about how your personal information is processed. If you do not agree with our
          policies and practices, please do not use our Services. If you still have any questions or
          concerns, please contact us at{' '}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>.
        </P>

        {/* Summary */}
        <div className="my-8 rounded-lg border border-iron-800 bg-iron-900 p-6">
          <h2 className="mb-4 font-display text-base font-semibold uppercase tracking-wide text-chalk">
            Summary of Key Points
          </h2>
          <div className="space-y-3 text-chalk-dim">
            <P>
              <strong className="text-chalk">What personal information do we process?</strong> When
              you visit, use, or navigate our Services, we may process personal information depending
              on how you interact with us and the Services, the choices you make, and the products
              and features you use. Learn more about{' '}
              <InternalLink href="#infocollect">personal information you disclose to us</InternalLink>.
            </P>
            <P>
              <strong className="text-chalk">Do we process any sensitive personal information?</strong>{' '}
              Some of the information may be considered &quot;special&quot; or &quot;sensitive&quot;
              in certain jurisdictions, for example your health data. We may process sensitive
              personal information when necessary with your consent or as otherwise permitted by
              applicable law. Learn more about{' '}
              <InternalLink href="#sensitiveinfo">sensitive information we process</InternalLink>.
            </P>
            <P>
              <strong className="text-chalk">Do we collect any information from third parties?</strong>{' '}
              We do not collect any information from third parties.
            </P>
            <P>
              <strong className="text-chalk">How do we process your information?</strong> We process
              your information to provide, improve, and administer our Services, communicate with
              you, for security and fraud prevention, and to comply with law. We may also process
              your information for other purposes with your consent. Learn more about{' '}
              <InternalLink href="#infouse">how we process your information</InternalLink>.
            </P>
            <P>
              <strong className="text-chalk">
                In what situations and with which parties do we share personal information?
              </strong>{' '}
              We may share information in specific situations and with specific third parties. Learn
              more about{' '}
              <InternalLink href="#whoshare">
                when and with whom we share your personal information
              </InternalLink>.
            </P>
            <P>
              <strong className="text-chalk">How do we keep your information safe?</strong> We have
              adequate organizational and technical processes and procedures in place to protect your
              personal information. However, no electronic transmission over the internet or
              information storage technology can be guaranteed to be 100% secure. Learn more about{' '}
              <InternalLink href="#infosafe">how we keep your information safe</InternalLink>.
            </P>
            <P>
              <strong className="text-chalk">What are your rights?</strong> Depending on where you
              are located geographically, the applicable privacy law may mean you have certain rights
              regarding your personal information. Learn more about{' '}
              <InternalLink href="#privacyrights">your privacy rights</InternalLink>.
            </P>
            <P>
              <strong className="text-chalk">How do you exercise your rights?</strong> The easiest
              way to exercise your rights is by contacting us at{' '}
              <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>. We will consider and act upon
              any request in accordance with applicable data protection laws.
            </P>
          </div>
        </div>

        {/* Table of Contents */}
        <div id="toc" className="my-8 rounded-lg border border-iron-800 bg-iron-900 p-6">
          <h2 className="mb-4 font-display text-base font-semibold uppercase tracking-wide text-chalk">
            Table of Contents
          </h2>
          <ol className="space-y-1 text-blood">
            {[
              ['#infocollect', '1. WHAT INFORMATION DO WE COLLECT?'],
              ['#infouse', '2. HOW DO WE PROCESS YOUR INFORMATION?'],
              ['#legalbases', '3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?'],
              ['#whoshare', '4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?'],
              ['#cookies', '5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?'],
              ['#ai', '6. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?'],
              ['#sociallogins', '7. HOW DO WE HANDLE YOUR SOCIAL LOGINS?'],
              ['#inforetain', '8. HOW LONG DO WE KEEP YOUR INFORMATION?'],
              ['#infosafe', '9. HOW DO WE KEEP YOUR INFORMATION SAFE?'],
              ['#privacyrights', '10. WHAT ARE YOUR PRIVACY RIGHTS?'],
              ['#DNT', '11. CONTROLS FOR DO-NOT-TRACK FEATURES'],
              ['#uslaws', '12. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?'],
              ['#policyupdates', '13. DO WE MAKE UPDATES TO THIS NOTICE?'],
              ['#contact', '14. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?'],
              ['#request', '15. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-blood hover:underline underline-offset-2">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* 1 */}
        <Section id="infocollect" number="1" title="WHAT INFORMATION DO WE COLLECT?" />
        <Sub title="Personal information you disclose to us" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We collect personal information that
            you provide to us.
          </em>
        </P>
        <P>
          We collect personal information that you voluntarily provide to us when you register on the
          Services, express an interest in obtaining information about us or our products and
          Services, when you participate in activities on the Services, or otherwise when you contact
          us.
        </P>
        <P>
          <strong className="text-chalk">Personal Information Provided by You.</strong> The personal
          information that we collect depends on the context of your interactions with us and the
          Services, the choices you make, and the products and features you use. The personal
          information we collect may include the following:
        </P>
        <Ul>
          <Li>Names</Li>
          <Li>Email addresses</Li>
          <Li>Passwords</Li>
          <Li>Debit/credit card numbers</Li>
        </Ul>

        <div id="sensitiveinfo">
          <P>
            <strong className="text-chalk">Sensitive Information.</strong> When necessary, with your
            consent or as otherwise permitted by applicable law, we process the following categories
            of sensitive information:
          </P>
          <Ul>
            <Li>Health data</Li>
          </Ul>
        </div>

        <P>
          <strong className="text-chalk">Payment Data.</strong> We may collect data necessary to
          process your payment if you choose to make purchases, such as your payment instrument
          number and the security code associated with your payment instrument. All payment data is
          handled and stored by <A href="https://stripe.com/">Stripe</A>. You may find their privacy
          notice at{' '}
          <A href="https://stripe.com/privacy">https://stripe.com/privacy</A>.
        </P>

        <P>
          <strong className="text-chalk">Social Media Login Data.</strong> We may provide you with
          the option to register with us using your existing social media account details, like your
          Facebook, X, or other social media account. If you choose to register in this way, we will
          collect certain profile information about you from the social media provider, as described
          in the section called{' '}
          <InternalLink href="#sociallogins">HOW DO WE HANDLE YOUR SOCIAL LOGINS?</InternalLink>{' '}
          below.
        </P>
        <P>
          All personal information that you provide to us must be true, complete, and accurate, and
          you must notify us of any changes to such personal information.
        </P>

        <Sub title="Information automatically collected" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> Some information — such as your
            Internet Protocol (IP) address and/or browser and device characteristics — is collected
            automatically when you visit our Services.
          </em>
        </P>
        <P>
          We automatically collect certain information when you visit, use, or navigate the
          Services. This information does not reveal your specific identity (like your name or
          contact information) but may include device and usage information, such as your IP
          address, browser and device characteristics, operating system, language preferences,
          referring URLs, device name, country, location, information about how and when you use our
          Services, and other technical information. This information is primarily needed to maintain
          the security and operation of our Services, and for our internal analytics and reporting
          purposes.
        </P>
        <P>
          Like many businesses, we also collect information through cookies and similar
          technologies.
        </P>
        <P>The information we collect includes:</P>
        <Ul>
          <Li>
            <em>Log and Usage Data.</em> Log and usage data is service-related, diagnostic, usage,
            and performance information our servers automatically collect when you access or use our
            Services and which we record in log files. Depending on how you interact with us, this
            log data may include your IP address, device information, browser type, and settings and
            information about your activity in the Services (such as the date/time stamps associated
            with your usage, pages and files viewed, searches, and other actions you take such as
            which features you use), device event information (such as system activity, error reports
            (sometimes called &quot;crash dumps&quot;), and hardware settings).
          </Li>
        </Ul>

        {/* 2 */}
        <Section id="infouse" number="2" title="HOW DO WE PROCESS YOUR INFORMATION?" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We process your information to
            provide, improve, and administer our Services, communicate with you, for security and
            fraud prevention, and to comply with law. We may also process your information for other
            purposes only with your prior explicit consent.
          </em>
        </P>
        <P>
          <strong className="text-chalk">
            We process your personal information for a variety of reasons, depending on how you
            interact with our Services, including:
          </strong>
        </P>
        <Ul>
          <Li>
            <strong className="text-chalk">
              To facilitate account creation and authentication and otherwise manage user accounts.
            </strong>{' '}
            We may process your information so you can create and log in to your account, as well as
            keep your account in working order.
          </Li>
          <Li>
            <strong className="text-chalk">
              To deliver and facilitate delivery of services to the user.
            </strong>{' '}
            We may process your information to provide you with the requested service.
          </Li>
        </Ul>

        {/* 3 */}
        <Section
          id="legalbases"
          number="3"
          title="WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?"
        />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We only process your personal
            information when we believe it is necessary and we have a valid legal reason (i.e., legal
            basis) to do so under applicable law, like with your consent, to comply with laws, to
            provide you with services to enter into or fulfill our contractual obligations, to protect
            your rights, or to fulfill our legitimate business interests.
          </em>
        </P>

        <P>
          <strong className="text-chalk">
            <u>If you are located in Canada, this section applies to you.</u>
          </strong>
        </P>
        <P>
          We may process your information if you have given us specific permission (i.e., express
          consent) to use your personal information for a specific purpose, or in situations where
          your permission can be inferred (i.e., implied consent). You can{' '}
          <InternalLink href="#withdrawconsent">withdraw your consent</InternalLink> at any time.
        </P>
        <P>
          In some exceptional cases, we may be legally permitted under applicable law to process your
          information without your consent, including, for example:
        </P>
        <Ul>
          <Li>
            If collection is clearly in the interests of an individual and consent cannot be obtained
            in a timely way
          </Li>
          <Li>For investigations and fraud detection and prevention</Li>
          <Li>For business transactions provided certain conditions are met</Li>
          <Li>
            If it is contained in a witness statement and the collection is necessary to assess,
            process, or settle an insurance claim
          </Li>
          <Li>
            For identifying injured, ill, or deceased persons and communicating with next of kin
          </Li>
          <Li>
            If we have reasonable grounds to believe an individual has been, is, or may be victim of
            financial abuse
          </Li>
          <Li>
            If it is reasonable to expect collection and use with consent would compromise the
            availability or the accuracy of the information and the collection is reasonable for
            purposes related to investigating a breach of an agreement or a contravention of the laws
            of Canada or a province
          </Li>
          <Li>
            If disclosure is required to comply with a subpoena, warrant, court order, or rules of
            the court relating to the production of records
          </Li>
          <Li>
            If it was produced by an individual in the course of their employment, business, or
            profession and the collection is consistent with the purposes for which the information
            was produced
          </Li>
          <Li>If the collection is solely for journalistic, artistic, or literary purposes</Li>
          <Li>
            If the information is publicly available and is specified by the regulations
          </Li>
          <Li>
            We may disclose de-identified information for approved research or statistics projects,
            subject to ethics oversight and confidentiality commitments
          </Li>
        </Ul>

        {/* 4 */}
        <Section
          id="whoshare"
          number="4"
          title="WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"
        />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We may share information in specific
            situations described in this section and/or with the following third parties.
          </em>
        </P>
        <P>We may need to share your personal information in the following situations:</P>
        <Ul>
          <Li>
            <strong className="text-chalk">Business Transfers.</strong> We may share or transfer
            your information in connection with, or during negotiations of, any merger, sale of
            company assets, financing, or acquisition of all or a portion of our business to another
            company.
          </Li>
        </Ul>

        {/* 5 */}
        <Section
          id="cookies"
          number="5"
          title="DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?"
        />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We may use cookies and other tracking
            technologies to collect and store your information.
          </em>
        </P>
        <P>
          We may use cookies and similar tracking technologies (like web beacons and pixels) to
          gather information when you interact with our Services. Some online tracking technologies
          help us maintain the security of our Services and your account, prevent crashes, fix bugs,
          save your preferences, and assist with basic site functions.
        </P>
        <P>
          We also permit third parties and service providers to use online tracking technologies on
          our Services for analytics and advertising, including to help manage and display
          advertisements, to tailor advertisements to your interests, or to send abandoned shopping
          cart reminders (depending on your communication preferences). The third parties and service
          providers use their technology to provide advertising about products and services tailored
          to your interests which may appear either on our Services or on other websites.
        </P>
        <P>
          To the extent these online tracking technologies are deemed to be a &quot;sale&quot;/
          &quot;sharing&quot; (which includes targeted advertising, as defined under the applicable
          laws) under applicable US state laws, you can opt out of these online tracking technologies
          by submitting a request as described below under section{' '}
          <InternalLink href="#uslaws">
            DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
          </InternalLink>
        </P>
        <P>
          Specific information about how we use such technologies and how you can refuse certain
          cookies is set out in our Cookie Notice.
        </P>

        {/* 6 */}
        <Section
          id="ai"
          number="6"
          title="DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?"
        />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We offer products, features, or tools
            powered by artificial intelligence, machine learning, or similar technologies.
          </em>
        </P>
        <P>
          As part of our Services, we offer products, features, or tools powered by artificial
          intelligence, machine learning, or similar technologies (collectively, &quot;AI
          Products&quot;). These tools are designed to enhance your experience and provide you with
          innovative solutions. The terms in this Privacy Notice govern your use of the AI Products
          within our Services.
        </P>
        <Sub title="Use of AI Technologies" />
        <P>
          We provide the AI Products through third-party service providers (&quot;AI Service
          Providers&quot;), including Google Cloud AI. As outlined in this Privacy Notice, your
          input, output, and personal information will be shared with and processed by these AI
          Service Providers to enable your use of our AI Products for purposes outlined in{' '}
          <InternalLink href="#whoshare">
            WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
          </InternalLink>
          . You must not use the AI Products in any way that violates the terms or policies of any
          AI Service Provider.
        </P>
        <Sub title="Our AI Products" />
        <P>Our AI Products are designed for the following functions:</P>
        <Ul>
          <Li>Video analysis</Li>
          <Li>AI insights</Li>
        </Ul>
        <Sub title="How We Process Your Data Using AI" />
        <P>
          All personal information processed using our AI Products is handled in line with our
          Privacy Notice and our agreement with third parties. This ensures high security and
          safeguards your personal information throughout the process, giving you peace of mind about
          your data&apos;s safety.
        </P>

        {/* 7 */}
        <Section id="sociallogins" number="7" title="HOW DO WE HANDLE YOUR SOCIAL LOGINS?" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> If you choose to register or log in
            to our Services using a social media account, we may have access to certain information
            about you.
          </em>
        </P>
        <P>
          Our Services offer you the ability to register and log in using your third-party social
          media account details (like your Facebook or X logins). Where you choose to do this, we
          will receive certain profile information about you from your social media provider. The
          profile information we receive may vary depending on the social media provider concerned,
          but will often include your name, email address, friends list, and profile picture, as well
          as other information you choose to make public on such a social media platform.
        </P>
        <P>
          We will use the information we receive only for the purposes that are described in this
          Privacy Notice or that are otherwise made clear to you on the relevant Services. Please
          note that we do not control, and are not responsible for, other uses of your personal
          information by your third-party social media provider. We recommend that you review their
          privacy notice to understand how they collect, use, and share your personal information,
          and how you can set your privacy preferences on their sites and apps.
        </P>

        {/* 8 */}
        <Section id="inforetain" number="8" title="HOW LONG DO WE KEEP YOUR INFORMATION?" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We keep your information for as long
            as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise
            required by law.
          </em>
        </P>
        <P>
          We will only keep your personal information for as long as it is necessary for the
          purposes set out in this Privacy Notice, unless a longer retention period is required or
          permitted by law (such as tax, accounting, or other legal requirements). No purpose in
          this notice will require us keeping your personal information for longer than the period of
          time in which users have an account with us.
        </P>
        <P>
          When we have no ongoing legitimate business need to process your personal information, we
          will either delete or anonymize such information, or, if this is not possible (for example,
          because your personal information has been stored in backup archives), then we will
          securely store your personal information and isolate it from any further processing until
          deletion is possible.
        </P>

        {/* 9 */}
        <Section id="infosafe" number="9" title="HOW DO WE KEEP YOUR INFORMATION SAFE?" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> We aim to protect your personal
            information through a system of organizational and technical security measures.
          </em>
        </P>
        <P>
          We have implemented appropriate and reasonable technical and organizational security
          measures designed to protect the security of any personal information we process. However,
          despite our safeguards and efforts to secure your information, no electronic transmission
          over the Internet or information storage technology can be guaranteed to be 100% secure, so
          we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third
          parties will not be able to defeat our security and improperly collect, access, steal, or
          modify your information. Although we will do our best to protect your personal information,
          transmission of personal information to and from our Services is at your own risk. You
          should only access the Services within a secure environment.
        </P>

        {/* 10 */}
        <Section id="privacyrights" number="10" title="WHAT ARE YOUR PRIVACY RIGHTS?" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> Depending on your state of residence
            in the US or in some regions, such as Canada, you have rights that allow you greater
            access to and control over your personal information. You may review, change, or
            terminate your account at any time, depending on your country, province, or state of
            residence.
          </em>
        </P>
        <P>
          In some regions (like Canada), you have certain rights under applicable data protection
          laws. These may include the right (i) to request access and obtain a copy of your personal
          information, (ii) to request rectification or erasure; (iii) to restrict the processing of
          your personal information; (iv) if applicable, to data portability; and (v) not to be
          subject to automated decision-making. If a decision that produces legal or similarly
          significant effects is made solely by automated means, we will inform you, explain the main
          factors, and offer a simple way to request human review. In certain circumstances, you may
          also have the right to object to the processing of your personal information. You can make
          such a request by contacting us using the contact details provided in the section{' '}
          <InternalLink href="#contact">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</InternalLink>{' '}
          below.
        </P>
        <P>
          We will consider and act upon any request in accordance with applicable data protection
          laws.
        </P>

        <div id="withdrawconsent">
          <P>
            <strong className="text-chalk">
              <u>Withdrawing your consent:</u>
            </strong>{' '}
            If we are relying on your consent to process your personal information, which may be
            express and/or implied consent depending on the applicable law, you have the right to
            withdraw your consent at any time. You can withdraw your consent at any time by
            contacting us using the contact details provided in the section{' '}
            <InternalLink href="#contact">
              HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
            </InternalLink>{' '}
            below.
          </P>
        </div>
        <P>
          However, please note that this will not affect the lawfulness of the processing before its
          withdrawal nor, when applicable law allows, will it affect the processing of your personal
          information conducted in reliance on lawful processing grounds other than consent.
        </P>

        <Sub title="Account Information" />
        <P>
          If you would at any time like to review or change the information in your account or
          terminate your account, you can:
        </P>
        <Ul>
          <Li>Log in to your account settings and update your user account.</Li>
        </Ul>
        <P>
          Upon your request to terminate your account, we will deactivate or delete your account and
          information from our active databases. However, we may retain some information in our files
          to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal
          terms and/or comply with applicable legal requirements.
        </P>
        <P>
          <strong className="text-chalk">
            <u>Cookies and similar technologies:</u>
          </strong>{' '}
          Most Web browsers are set to accept cookies by default. If you prefer, you can usually
          choose to set your browser to remove cookies and to reject cookies. If you choose to remove
          cookies or reject cookies, this could affect certain features or services of our Services.
        </P>
        <P>
          If you have questions or comments about your privacy rights, you may email us at{' '}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>.
        </P>

        {/* 11 */}
        <Section id="DNT" number="11" title="CONTROLS FOR DO-NOT-TRACK FEATURES" />
        <P>
          Most web browsers and some mobile operating systems and mobile applications include a
          Do-Not-Track (&quot;DNT&quot;) feature or setting you can activate to signal your privacy
          preference not to have data about your online browsing activities monitored and collected.
          At this stage, no uniform technology standard for recognizing and implementing DNT signals
          has been finalized. As such, we do not currently respond to DNT browser signals or any
          other mechanism that automatically communicates your choice not to be tracked online. If a
          standard for online tracking is adopted that we must follow in the future, we will inform
          you about that practice in a revised version of this Privacy Notice.
        </P>
        <P>
          California law requires us to let you know how we respond to web browser DNT signals.
          Because there currently is not an industry or legal standard for recognizing or honoring
          DNT signals, we do not respond to them at this time.
        </P>

        {/* 12 */}
        <Section
          id="uslaws"
          number="12"
          title="DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?"
        />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> If you are a resident of California,
            Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota,
            Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas,
            Utah, or Virginia, you may have the right to request access to and receive details about
            the personal information we maintain about you and how we have processed it, correct
            inaccuracies, get a copy of, or delete your personal information. You may also have the
            right to withdraw your consent to our processing of your personal information. These
            rights may be limited in some circumstances by applicable law. More information is
            provided below.
          </em>
        </P>

        <Sub title="Categories of Personal Information We Collect" />
        <P>
          The table below shows the categories of personal information we have collected in the past
          twelve (12) months. The table includes illustrative examples of each category and does not
          reflect the personal information we collect from you. For a comprehensive inventory of all
          personal information we process, please refer to the section{' '}
          <InternalLink href="#infocollect">WHAT INFORMATION DO WE COLLECT?</InternalLink>
        </P>

        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-iron-700 bg-iron-900 p-3 text-left font-semibold text-chalk">
                  Category
                </th>
                <th className="border border-iron-700 bg-iron-900 p-3 text-left font-semibold text-chalk">
                  Examples
                </th>
                <th className="border border-iron-700 bg-iron-900 p-3 text-left font-semibold text-chalk">
                  Collected
                </th>
              </tr>
            </thead>
            <tbody className="text-chalk-dim">
              {[
                [
                  'A. Identifiers',
                  'Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name',
                  'YES',
                ],
                [
                  'B. Personal information as defined in the California Customer Records statute',
                  'Name, contact information, education, employment, employment history, and financial information',
                  'YES',
                ],
                [
                  'C. Protected classification characteristics under state or federal law',
                  'Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data',
                  'YES',
                ],
                [
                  'D. Commercial information',
                  'Transaction information, purchase history, financial details, and payment information',
                  'NO',
                ],
                ['E. Biometric information', 'Fingerprints and voiceprints', 'NO'],
                [
                  'F. Internet or other similar network activity',
                  'Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements',
                  'NO',
                ],
                ['G. Geolocation data', 'Device location', 'NO'],
                [
                  'H. Audio, electronic, sensory, or similar information',
                  'Images and audio, video or call recordings created in connection with our business activities',
                  'YES',
                ],
                [
                  'I. Professional or employment-related information',
                  'Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us',
                  'NO',
                ],
                ['J. Education Information', 'Student records and directory information', 'NO'],
                [
                  'K. Inferences drawn from collected personal information',
                  'Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics',
                  'NO',
                ],
                [
                  'L. Sensitive personal information',
                  'Account login information and health data',
                  'YES',
                ],
              ].map(([cat, ex, col]) => (
                <tr key={cat}>
                  <td className="border border-iron-700 p-3 align-top">{cat}</td>
                  <td className="border border-iron-700 p-3 align-top">{ex}</td>
                  <td className="border border-iron-700 p-3 align-top font-semibold text-chalk">
                    {col}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <P>
          We only collect sensitive personal information, as defined by applicable privacy laws or
          the purposes allowed by law or with your consent. Sensitive personal information may be
          used, or disclosed to a service provider or contractor, for additional, specified purposes.
          You may have the right to limit the use or disclosure of your sensitive personal
          information. We do not collect or process sensitive personal information for the purpose of
          inferring characteristics about you.
        </P>
        <P>
          We may also collect other personal information outside of these categories through
          instances where you interact with us in person, online, or by phone or mail in the context
          of:
        </P>
        <Ul>
          <Li>Receiving help through our customer support channels;</Li>
          <Li>Participation in customer surveys or contests; and</Li>
          <Li>Facilitation in the delivery of our Services and to respond to your inquiries.</Li>
        </Ul>
        <P>We will use and retain the collected personal information as needed to provide the Services or for:</P>
        <Ul>
          <Li>Category A – As long as the user has an account with us</Li>
          <Li>Category B – As long as the user has an account with us</Li>
          <Li>Category C – As long as the user has an account with us</Li>
          <Li>Category H – As long as the user has an account with us</Li>
          <Li>Category L – As long as the user has an account with us</Li>
        </Ul>

        <Sub title="Sources of Personal Information" />
        <P>
          Learn more about the sources of personal information we collect in{' '}
          <InternalLink href="#infocollect">WHAT INFORMATION DO WE COLLECT?</InternalLink>
        </P>

        <Sub title="How We Use and Share Personal Information" />
        <P>
          Learn more about how we use your personal information in the section{' '}
          <InternalLink href="#infouse">HOW DO WE PROCESS YOUR INFORMATION?</InternalLink>
        </P>
        <P>
          <strong className="text-chalk">Will your information be shared with anyone else?</strong>
        </P>
        <P>
          We may disclose your personal information with our service providers pursuant to a written
          contract between us and each service provider. Learn more about how we disclose personal
          information in the section{' '}
          <InternalLink href="#whoshare">
            WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
          </InternalLink>
        </P>
        <P>
          We may use your personal information for our own business purposes, such as for undertaking
          internal research for technological development and demonstration. This is not considered to
          be &quot;selling&quot; of your personal information.
        </P>
        <P>
          We have not disclosed, sold, or shared any personal information to third parties for a
          business or commercial purpose in the preceding twelve (12) months. We will not sell or
          share personal information in the future belonging to website visitors, users, and other
          consumers.
        </P>

        <Sub title="Your Rights" />
        <P>
          You have rights under certain US state data protection laws. However, these rights are not
          absolute, and in certain cases, we may decline your request as permitted by law. These
          rights include:
        </P>
        <Ul>
          <Li>
            <strong className="text-chalk">Right to know</strong> whether or not we are processing
            your personal data
          </Li>
          <Li>
            <strong className="text-chalk">Right to access</strong> your personal data
          </Li>
          <Li>
            <strong className="text-chalk">Right to correct</strong> inaccuracies in your personal
            data
          </Li>
          <Li>
            <strong className="text-chalk">Right to request</strong> the deletion of your personal
            data
          </Li>
          <Li>
            <strong className="text-chalk">Right to obtain a copy</strong> of the personal data you
            previously shared with us
          </Li>
          <Li>
            <strong className="text-chalk">Right to non-discrimination</strong> for exercising your
            rights
          </Li>
          <Li>
            <strong className="text-chalk">Right to opt out</strong> of the processing of your
            personal data if it is used for targeted advertising (or sharing as defined under
            California&apos;s privacy law), the sale of personal data, or profiling in furtherance
            of decisions that produce legal or similarly significant effects (&quot;profiling&quot;)
          </Li>
        </Ul>
        <P>Depending upon the state where you live, you may also have the following rights:</P>
        <Ul>
          <Li>
            Right to access the categories of personal data being processed (as permitted by
            applicable law, including the privacy law in Minnesota)
          </Li>
          <Li>
            Right to obtain a list of the categories of third parties to which we have disclosed
            personal data (as permitted by applicable law, including the privacy law in California,
            Delaware, and Maryland)
          </Li>
          <Li>
            Right to obtain a list of specific third parties to which we have disclosed personal data
            (as permitted by applicable law, including the privacy law in Minnesota and Oregon)
          </Li>
          <Li>
            Right to obtain a list of third parties to which we have sold personal data (as permitted
            by applicable law, including the privacy law in Connecticut)
          </Li>
          <Li>
            Right to review, understand, question, and depending on where you live, correct how
            personal data has been profiled (as permitted by applicable law, including the privacy
            law in Connecticut and Minnesota)
          </Li>
          <Li>
            Right to limit use and disclosure of sensitive personal data (as permitted by applicable
            law, including the privacy law in California)
          </Li>
          <Li>
            Right to opt out of the collection of sensitive data and personal data collected through
            the operation of a voice or facial recognition feature (as permitted by applicable law,
            including the privacy law in Florida)
          </Li>
        </Ul>

        <Sub title="How to Exercise Your Rights" />
        <P>
          To exercise these rights, you can contact us by emailing us at{' '}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> or by referring to the contact
          details at the bottom of this document.
        </P>
        <P>
          Under certain US state data protection laws, you can designate an authorized agent to make
          a request on your behalf. We may deny a request from an authorized agent that does not
          submit proof that they have been validly authorized to act on your behalf in accordance
          with applicable laws.
        </P>

        <Sub title="Request Verification" />
        <P>
          Upon receiving your request, we will need to verify your identity to determine you are the
          same person about whom we have the information in our system. We will only use personal
          information provided in your request to verify your identity or authority to make the
          request. However, if we cannot verify your identity from the information already maintained
          by us, we may request that you provide additional information for the purposes of verifying
          your identity and for security or fraud-prevention purposes.
        </P>
        <P>
          If you submit the request through an authorized agent, we may need to collect additional
          information to verify your identity before processing your request and the agent will need
          to provide a written and signed permission from you to submit such request on your behalf.
        </P>

        <Sub title="Appeals" />
        <P>
          Under certain US state data protection laws, if we decline to take action regarding your
          request, you may appeal our decision by emailing us at{' '}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>. We will inform you in writing of
          any action taken or not taken in response to the appeal, including a written explanation of
          the reasons for the decisions. If your appeal is denied, you may submit a complaint to your
          state attorney general.
        </P>

        <Sub title='California "Shine The Light" Law' />
        <P>
          California Civil Code Section 1798.83, also known as the &quot;Shine The Light&quot; law,
          permits our users who are California residents to request and obtain from us, once a year
          and free of charge, information about categories of personal information (if any) we
          disclosed to third parties for direct marketing purposes and the names and addresses of all
          third parties with which we shared personal information in the immediately preceding
          calendar year. If you are a California resident and would like to make such a request,
          please submit your request in writing to us by using the contact details provided in the
          section{' '}
          <InternalLink href="#contact">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</InternalLink>
        </P>

        {/* 13 */}
        <Section id="policyupdates" number="13" title="DO WE MAKE UPDATES TO THIS NOTICE?" />
        <P>
          <em>
            <strong className="text-chalk">In Short:</strong> Yes, we will update this notice as
            necessary to stay compliant with relevant laws.
          </em>
        </P>
        <P>
          We may update this Privacy Notice from time to time. The updated version will be indicated
          by an updated &quot;Revised&quot; date at the top of this Privacy Notice. If we make
          material changes to this Privacy Notice, we may notify you either by prominently posting a
          notice of such changes or by directly sending you a notification. We encourage you to
          review this Privacy Notice frequently to be informed of how we are protecting your
          information.
        </P>

        {/* 14 */}
        <Section id="contact" number="14" title="HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" />
        <P>
          If you have questions or comments about this notice, you may email us at{' '}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> or contact us by post at:
        </P>
        <address className="mb-6 not-italic text-chalk-dim leading-relaxed">
          Liftly
          <br />
          WA 98052
          <br />
          United States
        </address>

        {/* 15 */}
        <Section
          id="request"
          number="15"
          title="HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?"
        />
        <P>
          Based on the applicable laws of your country or state of residence in the US, you may have
          the right to request access to the personal information we collect from you, details about
          how we have processed it, correct inaccuracies, or delete your personal information. You
          may also have the right to withdraw your consent to our processing of your personal
          information. These rights may be limited in some circumstances by applicable law. To
          request to review, update, or delete your personal information, please email us at{' '}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>.
        </P>
      </main>
    </div>
  );
}
