import { getSession } from '@/lib/auth';
import { LandingExperience } from '@/components/landing/LandingExperience';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Liftly',
      applicationCategory: 'SportsApplication',
      url: 'https://liftly.tech',
      description:
        'AI-powered powerlifting coach with block periodization programming, video form check, and nutrition tracking for competitive and serious lifters.',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free to start',
      },
      featureList: [
        'Block periodization program generation calibrated to 1RMs',
        'AI video form check for squat, bench press, and deadlift',
        'RPE-based autoregulation: the program adjusts on every logged set',
        'Nutrition planning with training-day calorie cycling',
        'Protein targets per kg of lean body mass',
        'Coach roster management console with AI-drafted adjustments',
      ],
    },
    {
      '@type': 'Organization',
      name: 'Liftly',
      url: 'https://liftly.tech',
      description:
        'AI powerlifting coaching platform for competitive and serious recreational lifters. Covers programming, form check, and nutrition.',
    },
    {
      '@type': 'WebSite',
      name: 'Liftly',
      url: 'https://liftly.tech',
    },
  ],
};

export default async function Landing() {
  const session = await getSession();
  // Logged-in lifters still get the marketing page. We only hand the client the
  // right place to land them, so the nav can offer "Go to dashboard" instead of
  // sign-in and every Start Lifting CTA routes them in rather than to /login.
  const dashboardHref = session
    ? session.hasProfile
      ? '/dashboard'
      : '/onboarding'
    : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingExperience dashboardHref={dashboardHref} />
    </>
  );
}
