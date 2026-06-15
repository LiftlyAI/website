import Link from 'next/link';
import type { Metadata } from 'next';
import { coachLeaderboard } from '@/lib/network-data';
import { PublicNetworkHeader } from '@/components/network/PublicNetworkHeader';
import { StarRating } from '@/components/ui/StarRating';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Coach Leaderboard · Liftly',
  description: 'Top-rated powerlifting coaches on Liftly, ranked by athlete reviews and activity.',
};

export default async function LeaderboardPage() {
  const coaches = await coachLeaderboard();

  return (
    <div className="min-h-screen bg-iron-950">
      <PublicNetworkHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="stagger space-y-6">
          <div>
            <div className="page-kicker mb-2">// COACHES NETWORK</div>
            <h1 className="stencil-heading mb-2 text-3xl text-chalk">Coach Leaderboard</h1>
            <div className="accent-divider mb-3 max-w-[100px]" />
            <p className="max-w-2xl font-body text-sm text-chalk-mute">
              Ranked by athlete rating, review volume, and active roster.
            </p>
          </div>

          {coaches.length === 0 ? (
            <div className="chalk-card p-8 text-center font-body text-sm text-chalk-mute">
              No ranked coaches yet.
            </div>
          ) : (
            <div className="chalk-card divide-y divide-iron-800 p-0">
              {coaches.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/coach/${c.username}`}
                  className="group flex items-center gap-4 px-5 py-4"
                >
                  <span
                    className={cn(
                      'w-7 shrink-0 text-center font-mono text-sm',
                      i === 0
                        ? 'text-rpe-mod'
                        : i < 3
                          ? 'text-chalk'
                          : 'text-chalk-mute',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-sm font-semibold text-chalk group-hover:text-blood-glow">
                      {c.name}
                    </div>
                    {c.profile.tagline && (
                      <div className="truncate font-mono text-xs text-chalk-mute">
                        {c.profile.tagline}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.rating != null ? (
                      <>
                        <StarRating value={c.rating} size={13} />
                        <span className="data-num text-xs text-chalk-dim">
                          {c.rating.toFixed(1)}
                        </span>
                        <span className="font-mono text-xs text-chalk-mute">({c.reviewCount})</span>
                      </>
                    ) : (
                      <span className="font-mono text-xs text-chalk-mute">—</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
