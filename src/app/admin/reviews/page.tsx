import Link from 'next/link';
import { Star } from 'lucide-react';
import { listReviewsForModeration } from '@/lib/admin-data';
import { Card } from '@/components/ui/Card';
import { AdminActionButton } from '../AdminActionButton';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const reviews = await listReviewsForModeration();

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// MODERATION</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Reviews</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
      </div>

      {reviews.length === 0 ? (
        <div className="chalk-card p-6 text-center font-body text-sm text-chalk-mute">
          No reviews yet.
        </div>
      ) : (
        reviews.map((r) => (
          <Card key={r.id} className={r.hidden ? 'opacity-60' : undefined}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm font-semibold text-chalk">
                    {r.athleteName ?? 'Athlete'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-chalk-dim">
                    <Star className="h-3 w-3 fill-rpe-mod text-rpe-mod" /> {r.rating}/5
                  </span>
                  <span className="font-mono text-xs text-chalk-mute">→</span>
                  {r.coachUsername ? (
                    <Link href={`/coach/${r.coachUsername}`} className="font-mono text-xs text-blood-glow hover:underline">
                      {r.coachName}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-chalk-mute">{r.coachName}</span>
                  )}
                  {r.hidden && (
                    <span className="rounded bg-rpe-max/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-rpe-max">
                      hidden
                    </span>
                  )}
                </div>
                {r.body && <p className="mt-1 font-body text-sm text-chalk-dim">{r.body}</p>}
              </div>
              <AdminActionButton
                body={{ entity: 'review', id: r.id, hidden: !r.hidden }}
                label={r.hidden ? 'Unhide' : 'Hide'}
                variant={r.hidden ? 'ghost' : 'danger'}
              />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
