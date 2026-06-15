// Shared option lists + label maps for the Coaches Network. Specialties are
// stored as slugs in CoachProfile.specialties; these maps render them and drive
// the discovery filters / profile editor so the two never drift apart.

export const SPECIALTIES: { slug: string; label: string }[] = [
  { slug: 'powerlifting', label: 'Powerlifting' },
  { slug: 'powerbuilding', label: 'Powerbuilding' },
  { slug: 'meet-prep', label: 'Meet Prep' },
  { slug: 'peaking', label: 'Peak Planning' },
  { slug: 'raw', label: 'Raw Lifting' },
  { slug: 'equipped', label: 'Equipped Lifting' },
  { slug: 'womens', label: "Women's Coaching" },
  { slug: 'teens', label: 'Teen Lifters' },
  { slug: 'beginner', label: 'Beginner Specialist' },
  { slug: 'bench', label: 'Bench Specialist' },
  { slug: 'hypertrophy', label: 'Hypertrophy' },
  { slug: 'online', label: 'Online Coaching' },
];

export const SPECIALTY_LABEL: Record<string, string> = Object.fromEntries(
  SPECIALTIES.map((s) => [s.slug, s.label]),
);

export function specialtyLabel(slug: string): string {
  return SPECIALTY_LABEL[slug] ?? slug;
}

export const FEDERATIONS = ['USAPL', 'IPF', 'USPA', 'IPL', 'WRPF', 'RPS'];

// Category rails on the discovery hub: a heading + the filter it applies.
export const DISCOVERY_RAILS: { title: string; filter: { specialty?: string; federation?: string } }[] = [
  { title: 'Meet Prep Specialists', filter: { specialty: 'meet-prep' } },
  { title: 'USAPL Coaches', filter: { federation: 'USAPL' } },
  { title: 'IPF Coaches', filter: { federation: 'IPF' } },
  { title: 'Raw Powerlifting', filter: { specialty: 'raw' } },
  { title: "Women's Coaching", filter: { specialty: 'womens' } },
  { title: 'Beginner Specialists', filter: { specialty: 'beginner' } },
  { title: 'Online Coaching', filter: { specialty: 'online' } },
  { title: 'Bench Specialists', filter: { specialty: 'bench' } },
];

export const AVAILABILITY_LABEL: Record<string, string> = {
  accepting: 'Accepting clients',
  waitlist: 'Waitlist',
  full: 'Full',
};

export const CADENCE_LABEL: Record<string, string> = {
  month: '/mo',
  'one-time': 'one-time',
  session: '/session',
};

// Price filter buckets (display-only pricing — no checkout). Matched against a
// coach's cheapest service price.
export const PRICE_BUCKETS: { value: string; label: string; min: number; max: number }[] = [
  { value: 'under-100', label: 'Under $100', min: 0, max: 100 },
  { value: '100-200', label: '$100 – $200', min: 100, max: 200 },
  { value: '200-300', label: '$200 – $300', min: 200, max: 300 },
  { value: '300-plus', label: '$300+', min: 300, max: Infinity },
];

export function priceInBucket(price: number | null, bucket: string): boolean {
  if (price == null) return false;
  const b = PRICE_BUCKETS.find((x) => x.value === bucket);
  if (!b) return true;
  return price >= b.min && price < b.max;
}

// Days window used to compute the "Rising Coaches" rail (recent follow growth).
export const RISING_WINDOW_DAYS = 14;

