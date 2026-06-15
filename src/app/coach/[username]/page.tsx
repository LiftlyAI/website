import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Users, Award, Clock, Star, BadgeCheck, ArrowRight } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getCoachSession } from '@/lib/coach-auth';
import {
  getCoachByUsername,
  isCoachSaved,
  isFollowing,
  athleteHasRelationship,
} from '@/lib/network-data';
import { specialtyLabel, AVAILABILITY_LABEL, CADENCE_LABEL } from '@/lib/network-constants';
import type { CoachShowcaseAthlete, CoachShowcaseResult } from '@/lib/types';
import { PublicNetworkHeader } from '@/components/network/PublicNetworkHeader';
import { ReportButton } from '@/components/network/ReportButton';
import { StarRating } from '@/components/ui/StarRating';
import { CoachProfileActions } from './CoachProfileActions';
import { ReviewForm } from './ReviewForm';

export const dynamic = 'force-dynamic';

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const coach = await getCoachByUsername(params.username);
  if (!coach) return { title: 'Coach · Liftly' };
  const specialties = (coach.profile.specialties ?? []).map(specialtyLabel).join(', ');
  return {
    title: `${coach.name} · Powerlifting Coach · Liftly`,
    description:
      coach.profile.tagline ||
      `${coach.name} — powerlifting coach on Liftly${specialties ? `. ${specialties}.` : '.'}`,
  };
}

export default async function CoachProfilePage({ params }: { params: { username: string } }) {
  const coach = await getCoachByUsername(params.username);
  if (!coach) notFound();

  const [athlete, coachSession] = await Promise.all([getSession(), getCoachSession()]);
  const isCoachViewer = !!coachSession && !athlete;

  let initialSaved = false;
  let initialFollowing = false;
  let canReview = false;
  let existingReview: { rating: number } | undefined;
  if (athlete) {
    [initialSaved, initialFollowing, canReview] = await Promise.all([
      isCoachSaved(athlete.id, coach.id),
      isFollowing(athlete.id, coach.id),
      athleteHasRelationship(coach.id, athlete.id),
    ]);
    const mine = coach.reviews.find((r) => r.athleteId === athlete.id);
    if (mine) existingReview = { rating: mine.rating };
  }

  const { profile } = coach;
  const availability = profile.availability ?? 'accepting';

  return (
    <div className="min-h-screen bg-iron-950">
      <PublicNetworkHeader />

      {/* Banner */}
      <div className="relative h-40 w-full overflow-hidden bg-iron-900 sm:h-56">
        {profile.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-iron-800 via-iron-900 to-blood/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-iron-950 to-transparent" />
      </div>

      <main className="mx-auto max-w-4xl px-6 pb-16">
        {/* Hero */}
        <div className="-mt-16 stagger">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoUrl}
                  alt={coach.name}
                  className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-4 ring-iron-950"
                />
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-iron-800 font-mono text-2xl text-chalk-dim ring-4 ring-iron-950">
                  {initials(coach.name)}
                </div>
              )}
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="stencil-heading text-3xl text-chalk">{coach.name}</h1>
                  {coach.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blood/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-blood-glow">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                {profile.tagline && (
                  <p className="font-body text-sm text-chalk-mute">{profile.tagline}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {coach.rating != null ? (
                    <>
                      <StarRating value={coach.rating} size={16} />
                      <span className="data-num text-sm text-chalk-dim">
                        {coach.rating.toFixed(1)}
                      </span>
                      <span className="font-mono text-xs text-chalk-mute">
                        ({coach.reviewCount} review{coach.reviewCount === 1 ? '' : 's'})
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-xs text-chalk-mute">No reviews yet</span>
                  )}
                </div>
              </div>
            </div>
            <CoachProfileActions
              username={coach.username}
              coachName={coach.name}
              isLoggedIn={!!athlete}
              isCoachViewer={isCoachViewer}
              initialSaved={initialSaved}
              initialFollowing={initialFollowing}
            />
          </div>

          {/* Stat strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Users className="h-4 w-4" />} label="Active athletes" value={String(coach.activeClients)} />
            {profile.experienceYears != null && (
              <Stat icon={<Award className="h-4 w-4" />} label="Years coaching" value={String(profile.experienceYears)} />
            )}
            {profile.location && (
              <Stat icon={<MapPin className="h-4 w-4" />} label="Based in" value={profile.location} />
            )}
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label="Availability"
              value={AVAILABILITY_LABEL[availability]}
            />
          </div>
        </div>

        {/* About */}
        {profile.bio && (
          <section className="mt-10">
            <h2 className="stencil-heading mb-3 text-lg text-chalk">About</h2>
            <div className="accent-divider mb-4 max-w-[80px]" />
            <p className="whitespace-pre-line font-body text-sm leading-relaxed text-chalk-dim">
              {profile.bio}
            </p>
          </section>
        )}

        {/* Specialties + credentials */}
        {((profile.specialties?.length ?? 0) > 0 ||
          (profile.federations?.length ?? 0) > 0 ||
          coach.credentials.length > 0) && (
          <section className="mt-10 space-y-4">
            <h2 className="stencil-heading text-lg text-chalk">Expertise</h2>
            <div className="accent-divider max-w-[80px]" />
            {(profile.specialties?.length ?? 0) > 0 && (
              <BadgeRow label="Specialties" items={profile.specialties!.map(specialtyLabel)} />
            )}
            {(profile.federations?.length ?? 0) > 0 && (
              <BadgeRow label="Federations" items={profile.federations!} accent />
            )}
            {coach.credentials.length > 0 && (
              <div>
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-chalk-mute">
                  Verified credentials
                </div>
                <div className="flex flex-wrap gap-2">
                  {coach.credentials.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blood/30 bg-blood/10 px-2.5 py-1 font-mono text-xs text-blood-glow"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {c.title}
                      {c.issuer ? ` · ${c.issuer}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Services */}
        {coach.services.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="stencil-heading text-lg text-chalk">Services</h2>
            <div className="accent-divider max-w-[80px]" />
            <div className="grid gap-4 sm:grid-cols-2">
              {coach.services.map((s) => (
                <div key={s.id} className="chalk-card flex flex-col p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-body text-sm font-semibold text-chalk">{s.name}</span>
                    {s.price != null && (
                      <span className="data-num text-chalk">
                        ${s.price}
                        <span className="font-mono text-xs text-chalk-mute"> {CADENCE_LABEL[s.cadence]}</span>
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="mt-1 font-body text-sm text-chalk-dim">{s.description}</p>
                  )}
                  {s.features.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {s.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 font-body text-xs text-chalk-mute">
                          <span className="h-1 w-1 rounded-full bg-blood" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <p className="font-mono text-[11px] text-chalk-mute">
              Pricing shown for reference — arrange coaching directly with the coach.
            </p>
          </section>
        )}

        {/* Coaching results */}
        {coach.showcase.some((s) => s.type === 'result') && (
          <section className="mt-10 space-y-4">
            <h2 className="stencil-heading text-lg text-chalk">Coaching results</h2>
            <div className="accent-divider max-w-[80px]" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(coach.showcase.filter((s) => s.type === 'result') as CoachShowcaseResult[]).map((s) => (
                <div key={s.id} className="chalk-card p-5">
                  <div className="font-body text-sm font-semibold text-chalk">{s.data.title}</div>
                  {(s.data.beforeValue != null || s.data.afterValue != null) && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="text-center">
                        <div className="font-mono text-[10px] uppercase text-chalk-mute">Before</div>
                        <div className="data-num text-lg text-chalk-dim">{s.data.beforeValue ?? '—'}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-blood" />
                      <div className="text-center">
                        <div className="font-mono text-[10px] uppercase text-chalk-mute">After</div>
                        <div className="data-num text-lg text-chalk">{s.data.afterValue ?? '—'}</div>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 font-mono text-xs text-chalk-mute">
                    {[s.data.lift, s.data.athleteName, s.data.timeframe].filter(Boolean).join(' · ')}
                  </div>
                  {s.data.detail && <p className="mt-2 font-body text-sm text-chalk-dim">{s.data.detail}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Coached athletes */}
        {coach.showcase.some((s) => s.type === 'athlete') && (
          <section className="mt-10 space-y-4">
            <h2 className="stencil-heading text-lg text-chalk">Coached athletes</h2>
            <div className="accent-divider max-w-[80px]" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(coach.showcase.filter((s) => s.type === 'athlete') as CoachShowcaseAthlete[]).map((s) => (
                <div key={s.id} className="chalk-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-body text-sm font-semibold text-chalk">{s.data.name}</span>
                    {s.data.weightClass && (
                      <span className="font-mono text-xs text-chalk-mute">{s.data.weightClass}</span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {(['bestSquat', 'bestBench', 'bestDeadlift'] as const).map((k, i) => (
                      <div key={k}>
                        <div className="font-mono text-[10px] uppercase text-chalk-mute">
                          {['SQ', 'BN', 'DL'][i]}
                        </div>
                        <div className="data-num text-chalk">{s.data[k] ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                  {s.data.meetResult && (
                    <div className="mt-2 font-mono text-xs text-blood-glow">{s.data.meetResult}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Posts */}
        {coach.posts.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="stencil-heading text-lg text-chalk">Latest from {coach.name}</h2>
            <div className="accent-divider max-w-[80px]" />
            <div className="space-y-3">
              {coach.posts.map((p) => (
                <article key={p.id} className="chalk-card p-5">
                  <h3 className="font-body text-sm font-semibold text-chalk">{p.title}</h3>
                  <p className="mt-1 whitespace-pre-line font-body text-sm text-chalk-dim">{p.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="mt-12 space-y-4">
          <h2 className="stencil-heading text-lg text-chalk">
            Reviews{coach.reviewCount > 0 && ` (${coach.reviewCount})`}
          </h2>
          <div className="accent-divider max-w-[80px]" />

          {canReview && <ReviewForm username={coach.username} existing={existingReview} />}

          {coach.reviews.length === 0 ? (
            <p className="font-body text-sm text-chalk-mute">
              No reviews yet. Only athletes coached by {coach.name} can leave one.
            </p>
          ) : (
            <div className="space-y-3">
              {coach.reviews.map((r) => (
                <div key={r.id} className="chalk-card p-4">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="font-body text-sm font-semibold text-chalk">
                      {r.athleteName ?? 'Athlete'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-chalk-dim">
                      <Star className="h-3 w-3 fill-rpe-mod text-rpe-mod" /> {r.rating}/5
                    </span>
                  </div>
                  {r.body && <p className="font-body text-sm text-chalk-dim">{r.body}</p>}
                  {athlete && (
                    <div className="mt-2 flex justify-end">
                      <ReportButton target={{ type: 'review', reviewId: r.id }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {athlete && (
          <div className="mt-10 flex justify-center">
            <ReportButton target={{ type: 'coach', username: coach.username }} />
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="chalk-card flex items-center gap-3 p-3">
      <span className="text-blood">{icon}</span>
      <div className="min-w-0">
        <div className="truncate font-body text-sm font-semibold text-chalk">{value}</div>
        <div className="font-mono text-[10px] uppercase tracking-wide text-chalk-mute">{label}</div>
      </div>
    </div>
  );
}

function BadgeRow({ label, items, accent }: { label: string; items: string[]; accent?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-chalk-mute">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it}
            className={
              accent
                ? 'rounded-lg border border-blood/30 bg-blood/10 px-2.5 py-1 font-mono text-xs text-blood-glow'
                : 'rounded-lg border border-iron-700 bg-iron-900/60 px-2.5 py-1 font-mono text-xs text-chalk-dim'
            }
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
