import Link from 'next/link';
import { MapPin, Users, BadgeCheck } from 'lucide-react';
import type { CoachCard } from '@/lib/types';
import { specialtyLabel, AVAILABILITY_LABEL } from '@/lib/network-constants';
import { StarRating } from '@/components/ui/StarRating';
import { cn } from '@/lib/utils';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function CoachCardItem({ coach }: { coach: CoachCard }) {
  const { profile } = coach;
  const availability = profile.availability ?? 'accepting';
  return (
    <Link
      href={`/coach/${coach.username}`}
      className="card-interactive group flex flex-col gap-3 rounded-xl p-5"
    >
      <div className="flex items-center gap-3">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoUrl}
            alt={coach.name}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-iron-700"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-iron-800 font-mono text-sm text-chalk-dim ring-1 ring-iron-700">
            {initials(coach.name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-body text-sm font-semibold text-chalk group-hover:text-blood-glow">
              {coach.name}
            </span>
            {coach.verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-blood-glow" aria-label="Verified coach" />
            )}
            {coach.featured && (
              <span className="rounded bg-blood/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-blood-glow">
                Featured
              </span>
            )}
          </div>
          {profile.tagline && (
            <div className="truncate font-body text-xs text-chalk-mute">{profile.tagline}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-chalk-mute">
        {coach.rating != null ? (
          <>
            <StarRating value={coach.rating} size={13} />
            <span className="data-num text-chalk-dim">{coach.rating.toFixed(1)}</span>
            <span className="font-mono">({coach.reviewCount})</span>
          </>
        ) : (
          <span className="font-mono text-chalk-mute">No reviews yet</span>
        )}
      </div>

      {(profile.specialties?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.specialties!.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded border border-iron-700 bg-iron-900/60 px-2 py-0.5 font-mono text-[10px] text-chalk-dim"
            >
              {specialtyLabel(s)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-1 font-mono text-[11px] text-chalk-mute">
        <span className="flex items-center gap-3">
          {profile.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {profile.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {coach.followerCount}
          </span>
          {coach.priceFrom != null && (
            <span className="text-chalk-dim">from ${coach.priceFrom}</span>
          )}
        </span>
        <span
          className={cn(
            'rounded px-1.5 py-0.5',
            availability === 'accepting'
              ? 'bg-rpe-easy/15 text-rpe-easy'
              : availability === 'waitlist'
                ? 'bg-rpe-mod/15 text-rpe-mod'
                : 'bg-iron-800 text-chalk-mute',
          )}
        >
          {AVAILABILITY_LABEL[availability]}
        </span>
      </div>
    </Link>
  );
}
