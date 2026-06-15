import Link from 'next/link';
import type { Metadata } from 'next';
import { Trophy } from 'lucide-react';
import { searchCoaches, featuredCoaches, risingCoaches } from '@/lib/network-data';
import type {
  CoachSearchFilters,
  CoachSort,
  Experience,
  CoachAvailability,
  PriceBucket,
} from '@/lib/types';
import { DISCOVERY_RAILS } from '@/lib/network-constants';
import { PublicNetworkHeader } from '@/components/network/PublicNetworkHeader';
import { CoachCardItem } from '@/components/network/CoachCardItem';
import { CoachSearchControls } from './CoachSearchControls';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Find a Powerlifting Coach · Liftly',
  description:
    'Discover verified powerlifting coaches on Liftly — search by federation, specialty, and experience. Meet prep, raw, equipped, beginner and online coaching.',
};

function parseFilters(sp: Record<string, string | string[] | undefined>): CoachSearchFilters {
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
  return {
    q: one('q'),
    specialty: one('specialty'),
    federation: one('federation'),
    experience: one('experience') as Experience | undefined,
    delivery: one('delivery') as 'online' | 'in-person' | undefined,
    availability: one('availability') as CoachAvailability | undefined,
    price: one('price') as PriceBucket | undefined,
    verifiedOnly: one('verified') === '1',
    sort: (one('sort') as CoachSort | undefined) ?? 'top-rated',
  };
}

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const hasFilter = !!(
    filters.q ||
    filters.specialty ||
    filters.federation ||
    filters.experience ||
    filters.delivery ||
    filters.availability ||
    filters.price ||
    filters.verifiedOnly
  );

  const [results, featured, rising] = await Promise.all([
    searchCoaches(filters),
    hasFilter ? Promise.resolve([]) : featuredCoaches(),
    hasFilter ? Promise.resolve([]) : risingCoaches(),
  ]);

  return (
    <div className="min-h-screen bg-iron-950">
      <PublicNetworkHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="stagger space-y-8">
          <div>
            <div className="page-kicker mb-2">// COACHES NETWORK</div>
            <h1 className="stencil-heading mb-3 text-4xl text-chalk sm:text-5xl">
              Find your powerlifting coach
            </h1>
            <div className="accent-divider mb-3 max-w-[120px]" />
            <p className="max-w-2xl font-body text-sm text-chalk-mute">
              The most trusted place to find a strength coach. Browse verified coaches, compare
              results, and apply — your coaching relationship lives right inside Liftly.
            </p>
          </div>

          <CoachSearchControls />

          {/* Quick category rails (unfiltered only) */}
          {!hasFilter && (
            <div className="flex flex-wrap gap-2">
              {DISCOVERY_RAILS.map((rail) => {
                const sp = new URLSearchParams(rail.filter as Record<string, string>).toString();
                return (
                  <Link
                    key={rail.title}
                    href={`/coaches?${sp}`}
                    className="rounded-full border border-iron-700 bg-iron-900/60 px-3 py-1.5 font-body text-xs text-chalk-dim transition-all hover:border-blood/60 hover:text-chalk"
                  >
                    {rail.title}
                  </Link>
                );
              })}
              <Link
                href="/coaches/leaderboard"
                className="inline-flex items-center gap-1 rounded-full border border-blood/40 bg-blood/10 px-3 py-1.5 font-body text-xs text-blood-glow transition-all hover:bg-blood/20"
              >
                <Trophy className="h-3 w-3" /> Leaderboard
              </Link>
            </div>
          )}

          {/* Featured (unfiltered only) */}
          {!hasFilter && featured.length > 0 && (
            <section className="space-y-3">
              <h2 className="stencil-heading text-lg text-chalk">Featured coaches</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((c) => (
                  <CoachCardItem key={c.id} coach={c} />
                ))}
              </div>
            </section>
          )}

          {/* Rising (unfiltered only) */}
          {!hasFilter && rising.length > 0 && (
            <section className="space-y-3">
              <h2 className="stencil-heading text-lg text-chalk">Rising coaches</h2>
              <p className="font-mono text-xs text-chalk-mute">Gaining followers fast right now.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {rising.map((c) => (
                  <CoachCardItem key={c.id} coach={c} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="stencil-heading text-lg text-chalk">
              {hasFilter ? `${results.length} coach${results.length === 1 ? '' : 'es'}` : 'All coaches'}
            </h2>
            {results.length === 0 ? (
              <div className="chalk-card p-8 text-center font-body text-sm text-chalk-mute">
                No coaches match those filters yet. Try widening your search.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((c) => (
                  <CoachCardItem key={c.id} coach={c} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
