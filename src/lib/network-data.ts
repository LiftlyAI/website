// Coaches Network data-access — the public marketplace half (mirrors the style
// of coach-data.ts: raw SQL via ./db, JSON parse, view-model mapping). This is
// the read/write layer behind the discovery hub, public profiles, applications,
// reviews and saves. Authorization lives in the routes/callers; the only gate
// enforced HERE is the review relationship check (athleteHasRelationship).

import { execute, query, queryOne, uuid } from './db';
import { RISING_WINDOW_DAYS, priceInBucket } from './network-constants';
import type {
  ApplicationStatus,
  CoachApplication,
  CoachApplicationPayload,
  CoachCard,
  CoachCredential,
  CoachPost,
  CoachProfile,
  CoachPublic,
  CoachReview,
  CoachSearchFilters,
  CoachService,
  CoachShowcase,
  Report,
  ReportStatus,
  ServiceCadence,
  ShowcaseAthleteData,
  ShowcaseResultData,
} from './types';

// Usernames that would shadow a real /coach/* console or auth segment. A coach
// can never claim one of these, so the dynamic /coach/[username] route stays
// safely behind the static console routes in Next.js precedence.
export const RESERVED_COACH_USERNAMES = new Set([
  'login',
  'logout',
  'roster',
  'bulk',
  'clients',
  'profile',
  'applications',
  'auth',
  'console',
  'settings',
]);

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username) && !RESERVED_COACH_USERNAMES.has(username);
}

function parseProfile(json: string | null): CoachProfile {
  if (!json) return {};
  try {
    return JSON.parse(json) as CoachProfile;
  } catch {
    return {};
  }
}

function resolveName(name: string | null, profile: CoachProfile): string {
  return profile.displayName?.trim() || name?.trim() || 'Coach';
}

// ---------- Aggregate row shared by card/profile reads ----------

interface CoachRow {
  id: string;
  username: string;
  name: string | null;
  profile_json: string | null;
  featured: boolean;
  verified: boolean;
  rating: number | null;
  review_count: number;
  active_clients: number;
  follower_count: number;
  rising_count: number;
  price_from: number | null;
}

const RISING_SINCE = () => Date.now() - RISING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// `?` here is bound to the rising-window cutoff; every caller using AGG_SELECT
// must pass that timestamp as its FIRST param.
const AGG_SELECT = `
  c.id, c.username, c.name, c.profile_json, c.featured, c.verified,
  (SELECT AVG(r.rating) FROM coach_reviews r WHERE r.coach_id = c.id AND r.hidden = false) AS rating,
  (SELECT COUNT(*) FROM coach_reviews r WHERE r.coach_id = c.id AND r.hidden = false) AS review_count,
  (SELECT COUNT(*) FROM coach_athletes ca
     WHERE ca.coach_id = c.id AND ca.status = 'active') AS active_clients,
  (SELECT COUNT(*) FROM coach_follows f WHERE f.coach_id = c.id) AS follower_count,
  (SELECT COUNT(*) FROM coach_follows f WHERE f.coach_id = c.id AND f.created_at >= ?) AS rising_count,
  (SELECT MIN(s.price) FROM coach_services s WHERE s.coach_id = c.id) AS price_from
`;

function toCard(r: CoachRow): CoachCard {
  const profile = parseProfile(r.profile_json);
  return {
    id: r.id,
    username: r.username,
    name: resolveName(r.name, profile),
    profile,
    featured: !!r.featured,
    verified: !!r.verified,
    rating: r.rating == null ? null : Number(r.rating),
    reviewCount: Number(r.review_count),
    activeClients: Number(r.active_clients),
    followerCount: Number(r.follower_count),
    priceFrom: r.price_from == null ? null : Number(r.price_from),
  };
}

// ---------- Discovery ----------

// At seed/demo scale we pull every listed coach and filter the JSON fields
// (specialty/federation/free-text/availability) in JS. Rating + client counts
// come from SQL. Move filterable fields to jsonb/denormalized columns + indexed
// WHERE clauses when the listed-coach count grows past a few hundred.
export async function searchCoaches(filters: CoachSearchFilters = {}): Promise<CoachCard[]> {
  const rows = await query<CoachRow>(
    `SELECT ${AGG_SELECT}
       FROM coaches c
      WHERE c.listed = true AND c.banned = false AND c.username IS NOT NULL`,
    [RISING_SINCE()],
  );
  let cards = rows.map(toCard);
  if (filters.verifiedOnly) cards = cards.filter((c) => c.verified);
  if (filters.price) cards = cards.filter((c) => priceInBucket(c.priceFrom, filters.price!));

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    cards = cards.filter((c) => {
      const hay = [
        c.name,
        c.profile.tagline,
        c.profile.bio,
        c.profile.location,
        ...(c.profile.specialties ?? []),
        ...(c.profile.federations ?? []),
        ...(c.profile.credentials ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
  if (filters.specialty) {
    cards = cards.filter((c) => c.profile.specialties?.includes(filters.specialty!));
  }
  if (filters.federation) {
    cards = cards.filter((c) =>
      c.profile.federations?.some((f) => f.toLowerCase() === filters.federation!.toLowerCase()),
    );
  }
  if (filters.experience) {
    // experienceYears buckets: novice <3, intermediate 3-7, advanced 7+
    cards = cards.filter((c) => {
      const y = c.profile.experienceYears ?? 0;
      if (filters.experience === 'novice') return y < 3;
      if (filters.experience === 'intermediate') return y >= 3 && y < 7;
      return y >= 7;
    });
  }
  if (filters.delivery === 'online') cards = cards.filter((c) => c.profile.online);
  if (filters.delivery === 'in-person') cards = cards.filter((c) => c.profile.inPerson);
  if (filters.availability) {
    cards = cards.filter((c) => (c.profile.availability ?? 'accepting') === filters.availability);
  }

  const sort = filters.sort ?? 'top-rated';
  cards.sort((a, b) => {
    if (sort === 'rising') return b.followerCount - a.followerCount;
    if (sort === 'recent') return 0; // stable; seeded order
    // top-rated: rating desc (nulls last), then review count
    const ra = a.rating ?? -1;
    const rb = b.rating ?? -1;
    if (rb !== ra) return rb - ra;
    return b.reviewCount - a.reviewCount;
  });
  return cards;
}

export async function featuredCoaches(limit = 4): Promise<CoachCard[]> {
  const rows = await query<CoachRow>(
    `SELECT ${AGG_SELECT}
       FROM coaches c
      WHERE c.listed = true AND c.banned = false AND c.username IS NOT NULL AND c.featured = true
      LIMIT ?`,
    [RISING_SINCE(), limit],
  );
  return rows.map(toCard);
}

// Leaderboard: rating, then review volume, then active roster size.
export async function coachLeaderboard(limit = 25): Promise<CoachCard[]> {
  const cards = await searchCoaches({ sort: 'top-rated' });
  return cards.slice(0, limit);
}

// "Rising Coaches" rail: most new followers in the recent window, then total.
export async function risingCoaches(limit = 4): Promise<CoachCard[]> {
  const rows = await query<CoachRow>(
    `SELECT ${AGG_SELECT}
       FROM coaches c
      WHERE c.listed = true AND c.banned = false AND c.username IS NOT NULL`,
    [RISING_SINCE()],
  );
  return rows
    .map((r) => ({ card: toCard(r), rising: Number(r.rising_count) }))
    .filter((x) => x.rising > 0)
    .sort((a, b) => b.rising - a.rising || b.card.followerCount - a.card.followerCount)
    .slice(0, limit)
    .map((x) => x.card);
}

// ---------- Public profile ----------

export async function getCoachByUsername(username: string): Promise<CoachPublic | null> {
  const row = await queryOne<CoachRow>(
    `SELECT ${AGG_SELECT}
       FROM coaches c
      WHERE c.username = ? AND c.listed = true AND c.banned = false`,
    [RISING_SINCE(), normalizeUsername(username)],
  );
  if (!row) return null;
  const card = toCard(row);
  const [reviews, credentials, services, showcase, posts] = await Promise.all([
    listReviews(row.id),
    listApprovedCredentials(row.id),
    listServices(row.id),
    listShowcase(row.id),
    listPosts(row.id, 6),
  ]);
  return { ...card, reviews, credentials, services, showcase, posts };
}

// ---------- Coach profile editing (console side) ----------

export interface CoachProfileEditResult {
  ok: boolean;
  error?: 'username-taken' | 'username-invalid';
}

export async function getCoachEditState(
  coachId: string,
): Promise<{ username: string | null; profile: CoachProfile; listed: boolean }> {
  const row = await queryOne<{ username: string | null; profile_json: string | null; listed: boolean }>(
    'SELECT username, profile_json, listed FROM coaches WHERE id = ?',
    [coachId],
  );
  return {
    username: row?.username ?? null,
    profile: parseProfile(row?.profile_json ?? null),
    listed: !!row?.listed,
  };
}

export async function updateCoachProfile(
  coachId: string,
  profile: CoachProfile,
  username: string,
  listed: boolean,
): Promise<CoachProfileEditResult> {
  const uname = normalizeUsername(username);
  if (!isValidUsername(uname)) return { ok: false, error: 'username-invalid' };

  const clash = await queryOne<{ id: string }>(
    'SELECT id FROM coaches WHERE username = ? AND id <> ?',
    [uname, coachId],
  );
  if (clash) return { ok: false, error: 'username-taken' };

  await execute('UPDATE coaches SET username = ?, profile_json = ?, listed = ? WHERE id = ?', [
    uname,
    JSON.stringify(profile),
    listed,
    coachId,
  ]);
  return { ok: true };
}

// ---------- Applications ----------

interface ApplicationRow {
  id: string;
  coach_id: string;
  athlete_id: string;
  athlete_name: string | null;
  athlete_email: string;
  status: string;
  payload_json: string;
  coach_note: string | null;
  created_at: number;
  resolved_at: number | null;
}

function toApplication(r: ApplicationRow): CoachApplication {
  return {
    id: r.id,
    coachId: r.coach_id,
    athleteId: r.athlete_id,
    athleteName: r.athlete_name,
    athleteEmail: r.athlete_email,
    status: r.status as ApplicationStatus,
    payload: JSON.parse(r.payload_json) as CoachApplicationPayload,
    coachNote: r.coach_note,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

// Athlete applies. Re-applying (or applying after a rejection) reopens the same
// row as pending rather than erroring on the (coach, athlete) unique key.
export async function createApplication(
  coachId: string,
  athleteId: string,
  payload: CoachApplicationPayload,
): Promise<void> {
  await execute(
    `INSERT INTO coach_applications (id, coach_id, athlete_id, status, payload_json, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?)
     ON CONFLICT (coach_id, athlete_id) DO UPDATE
       SET status = 'pending', payload_json = excluded.payload_json,
           created_at = excluded.created_at, resolved_at = NULL, coach_note = NULL`,
    [uuid(), coachId, athleteId, JSON.stringify(payload), Date.now()],
  );
}

export async function listApplicationsForCoach(coachId: string): Promise<CoachApplication[]> {
  const rows = await query<ApplicationRow>(
    `SELECT ap.id, ap.coach_id, ap.athlete_id, a.name AS athlete_name, a.email AS athlete_email,
            ap.status, ap.payload_json, ap.coach_note, ap.created_at, ap.resolved_at
       FROM coach_applications ap
       JOIN athletes a ON a.id = ap.athlete_id
      WHERE ap.coach_id = ?
      ORDER BY CASE ap.status WHEN 'pending' THEN 0 ELSE 1 END, ap.created_at DESC`,
    [coachId],
  );
  return rows.map(toApplication);
}

export async function getApplication(id: string): Promise<CoachApplication | null> {
  const row = await queryOne<ApplicationRow>(
    `SELECT ap.id, ap.coach_id, ap.athlete_id, a.name AS athlete_name, a.email AS athlete_email,
            ap.status, ap.payload_json, ap.coach_note, ap.created_at, ap.resolved_at
       FROM coach_applications ap
       JOIN athletes a ON a.id = ap.athlete_id
      WHERE ap.id = ?`,
    [id],
  );
  return row ? toApplication(row) : null;
}

// Coach verdict. On accept we create the roster link + coached_by routing using
// the SAME mechanism as the manual roster add (api/coach/roster/route.ts), so an
// accepted athlete drops straight into the existing triage/suggestion console.
export async function resolveApplication(
  application: CoachApplication,
  action: Extract<ApplicationStatus, 'accepted' | 'rejected' | 'waitlisted'>,
  note?: string,
): Promise<void> {
  if (action === 'accepted') {
    await execute(
      `INSERT INTO coach_athletes (coach_id, athlete_id, status, created_at)
       VALUES (?, ?, 'active', ?)
       ON CONFLICT (coach_id, athlete_id) DO UPDATE SET status = 'active'`,
      [application.coachId, application.athleteId, Date.now()],
    );
    await execute('UPDATE athletes SET coached_by = ? WHERE id = ?', [
      application.coachId,
      application.athleteId,
    ]);
  }
  await execute(
    'UPDATE coach_applications SET status = ?, coach_note = ?, resolved_at = ? WHERE id = ?',
    [action, note ?? null, Date.now(), application.id],
  );
}

// ---------- Reviews ----------

interface ReviewRow {
  id: string;
  coach_id: string;
  athlete_id: string;
  athlete_name: string | null;
  rating: number;
  communication: number | null;
  programming: number | null;
  meet_prep: number | null;
  responsiveness: number | null;
  body: string | null;
  created_at: number;
}

function toReview(r: ReviewRow): CoachReview {
  return {
    id: r.id,
    coachId: r.coach_id,
    athleteId: r.athlete_id,
    athleteName: r.athlete_name,
    rating: r.rating,
    communication: r.communication,
    programming: r.programming,
    meetPrep: r.meet_prep,
    responsiveness: r.responsiveness,
    body: r.body,
    createdAt: r.created_at,
  };
}

export async function listReviews(coachId: string): Promise<CoachReview[]> {
  const rows = await query<ReviewRow>(
    `SELECT r.id, r.coach_id, r.athlete_id, a.name AS athlete_name, r.rating,
            r.communication, r.programming, r.meet_prep, r.responsiveness, r.body, r.created_at
       FROM coach_reviews r
       JOIN athletes a ON a.id = r.athlete_id
      WHERE r.coach_id = ? AND r.hidden = false
      ORDER BY r.created_at DESC`,
    [coachId],
  );
  return rows.map(toReview);
}

// The "verified athlete" gate: an athlete may review a coach only if they have a
// current or past roster link, or an accepted application, with that coach.
export async function athleteHasRelationship(
  coachId: string,
  athleteId: string,
): Promise<boolean> {
  const link = await queryOne(
    'SELECT 1 AS one FROM coach_athletes WHERE coach_id = ? AND athlete_id = ?',
    [coachId, athleteId],
  );
  if (link) return true;
  const accepted = await queryOne(
    "SELECT 1 AS one FROM coach_applications WHERE coach_id = ? AND athlete_id = ? AND status = 'accepted'",
    [coachId, athleteId],
  );
  return !!accepted;
}

export interface CreateReviewInput {
  rating: number;
  communication?: number;
  programming?: number;
  meetPrep?: number;
  responsiveness?: number;
  body?: string;
}

export async function createReview(
  coachId: string,
  athleteId: string,
  input: CreateReviewInput,
): Promise<void> {
  await execute(
    `INSERT INTO coach_reviews
       (id, coach_id, athlete_id, rating, communication, programming, meet_prep, responsiveness, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (coach_id, athlete_id) DO UPDATE SET
       rating = excluded.rating, communication = excluded.communication,
       programming = excluded.programming, meet_prep = excluded.meet_prep,
       responsiveness = excluded.responsiveness, body = excluded.body,
       created_at = excluded.created_at`,
    [
      uuid(),
      coachId,
      athleteId,
      input.rating,
      input.communication ?? null,
      input.programming ?? null,
      input.meetPrep ?? null,
      input.responsiveness ?? null,
      input.body ?? null,
      Date.now(),
    ],
  );
}

// ---------- Saves ----------

export async function saveCoach(athleteId: string, coachId: string): Promise<void> {
  await execute(
    `INSERT INTO coach_saves (athlete_id, coach_id, created_at) VALUES (?, ?, ?)
     ON CONFLICT (athlete_id, coach_id) DO NOTHING`,
    [athleteId, coachId, Date.now()],
  );
}

export async function unsaveCoach(athleteId: string, coachId: string): Promise<void> {
  await execute('DELETE FROM coach_saves WHERE athlete_id = ? AND coach_id = ?', [
    athleteId,
    coachId,
  ]);
}

export async function isCoachSaved(athleteId: string, coachId: string): Promise<boolean> {
  const row = await queryOne(
    'SELECT 1 AS one FROM coach_saves WHERE athlete_id = ? AND coach_id = ?',
    [athleteId, coachId],
  );
  return !!row;
}

export async function listSavedCoaches(athleteId: string): Promise<CoachCard[]> {
  const rows = await query<CoachRow>(
    `SELECT ${AGG_SELECT}
       FROM coach_saves s
       JOIN coaches c ON c.id = s.coach_id
      WHERE s.athlete_id = ? AND c.username IS NOT NULL AND c.banned = false
      ORDER BY s.created_at DESC`,
    [RISING_SINCE(), athleteId],
  );
  return rows.map(toCard);
}

// ---------- Athlete relationship summary (for /(app)/coaching) ----------

export interface AthleteCoachingSummary {
  currentCoach: { id: string; username: string | null; name: string } | null;
  applications: { coachName: string; coachUsername: string | null; status: ApplicationStatus; createdAt: number }[];
  saved: CoachCard[];
  following: CoachCard[];
}

export async function getAthleteCoaching(athleteId: string): Promise<AthleteCoachingSummary> {
  const coachRow = await queryOne<{ id: string; username: string | null; name: string | null; profile_json: string | null }>(
    `SELECT c.id, c.username, c.name, c.profile_json
       FROM athletes a JOIN coaches c ON c.id = a.coached_by
      WHERE a.id = ?`,
    [athleteId],
  );
  const apps = await query<{
    status: string;
    created_at: number;
    coach_name: string | null;
    coach_username: string | null;
    profile_json: string | null;
  }>(
    `SELECT ap.status, ap.created_at, c.name AS coach_name, c.username AS coach_username, c.profile_json
       FROM coach_applications ap JOIN coaches c ON c.id = ap.coach_id
      WHERE ap.athlete_id = ?
      ORDER BY ap.created_at DESC`,
    [athleteId],
  );
  return {
    currentCoach: coachRow
      ? {
          id: coachRow.id,
          username: coachRow.username,
          name: resolveName(coachRow.name, parseProfile(coachRow.profile_json)),
        }
      : null,
    applications: apps.map((a) => ({
      coachName: resolveName(a.coach_name, parseProfile(a.profile_json)),
      coachUsername: a.coach_username,
      status: a.status as ApplicationStatus,
      createdAt: a.created_at,
    })),
    saved: await listSavedCoaches(athleteId),
    following: await listFollowedCoaches(athleteId),
  };
}

// Resolve a listed coach id from username (used by apply/save/review routes that
// receive a username from the public profile).
export async function coachIdForUsername(username: string): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM coaches WHERE username = ? AND listed = true AND banned = false',
    [normalizeUsername(username)],
  );
  return row?.id ?? null;
}

// ---------- Credentials ----------

interface CredentialRow {
  id: string;
  coach_id: string;
  title: string;
  issuer: string | null;
  document_url: string | null;
  status: string;
  created_at: number;
  reviewed_at: number | null;
}

function toCredential(r: CredentialRow): CoachCredential {
  return {
    id: r.id,
    coachId: r.coach_id,
    title: r.title,
    issuer: r.issuer,
    documentUrl: r.document_url,
    status: r.status as CoachCredential['status'],
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  };
}

export async function listApprovedCredentials(coachId: string): Promise<CoachCredential[]> {
  const rows = await query<CredentialRow>(
    "SELECT * FROM coach_credentials WHERE coach_id = ? AND status = 'approved' ORDER BY created_at",
    [coachId],
  );
  return rows.map(toCredential);
}

export async function listCredentials(coachId: string): Promise<CoachCredential[]> {
  const rows = await query<CredentialRow>(
    'SELECT * FROM coach_credentials WHERE coach_id = ? ORDER BY created_at',
    [coachId],
  );
  return rows.map(toCredential);
}

export async function addCredential(
  coachId: string,
  title: string,
  issuer?: string,
  documentUrl?: string,
): Promise<void> {
  await execute(
    `INSERT INTO coach_credentials (id, coach_id, title, issuer, document_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [uuid(), coachId, title, issuer ?? null, documentUrl ?? null, Date.now()],
  );
}

export async function deleteCredential(coachId: string, id: string): Promise<void> {
  await execute('DELETE FROM coach_credentials WHERE id = ? AND coach_id = ?', [id, coachId]);
}

// ---------- Services (display-only) ----------

interface ServiceRow {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  price: number | null;
  cadence: string;
  features_json: string | null;
  sort_order: number;
}

function toService(r: ServiceRow): CoachService {
  return {
    id: r.id,
    coachId: r.coach_id,
    name: r.name,
    description: r.description,
    price: r.price == null ? null : Number(r.price),
    cadence: r.cadence as ServiceCadence,
    features: r.features_json ? (JSON.parse(r.features_json) as string[]) : [],
    sortOrder: r.sort_order,
  };
}

export async function listServices(coachId: string): Promise<CoachService[]> {
  const rows = await query<ServiceRow>(
    'SELECT * FROM coach_services WHERE coach_id = ? ORDER BY sort_order, created_at',
    [coachId],
  );
  return rows.map(toService);
}

export interface ServiceInput {
  name: string;
  description?: string;
  price?: number | null;
  cadence: ServiceCadence;
  features?: string[];
}

// Replace-all: simplest correct semantics for the profile editor.
export async function replaceServices(coachId: string, services: ServiceInput[]): Promise<void> {
  await execute('DELETE FROM coach_services WHERE coach_id = ?', [coachId]);
  let i = 0;
  for (const s of services) {
    await execute(
      `INSERT INTO coach_services
         (id, coach_id, name, description, price, cadence, features_json, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid(),
        coachId,
        s.name,
        s.description ?? null,
        s.price ?? null,
        s.cadence,
        JSON.stringify(s.features ?? []),
        i++,
        Date.now(),
      ],
    );
  }
}

// ---------- Showcase (results + coached athletes) ----------

interface ShowcaseRow {
  id: string;
  coach_id: string;
  type: string;
  data_json: string;
  sort_order: number;
}

function toShowcase(r: ShowcaseRow): CoachShowcase {
  const data = JSON.parse(r.data_json);
  if (r.type === 'athlete') {
    return { id: r.id, type: 'athlete', sortOrder: r.sort_order, data: data as ShowcaseAthleteData };
  }
  return { id: r.id, type: 'result', sortOrder: r.sort_order, data: data as ShowcaseResultData };
}

export async function listShowcase(coachId: string): Promise<CoachShowcase[]> {
  const rows = await query<ShowcaseRow>(
    'SELECT * FROM coach_showcase WHERE coach_id = ? ORDER BY sort_order, created_at',
    [coachId],
  );
  return rows.map(toShowcase);
}

export interface ShowcaseInput {
  type: 'result' | 'athlete';
  data: ShowcaseResultData | ShowcaseAthleteData;
}

export async function replaceShowcase(coachId: string, items: ShowcaseInput[]): Promise<void> {
  await execute('DELETE FROM coach_showcase WHERE coach_id = ?', [coachId]);
  let i = 0;
  for (const it of items) {
    await execute(
      `INSERT INTO coach_showcase (id, coach_id, type, data_json, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), coachId, it.type, JSON.stringify(it.data), i++, Date.now()],
    );
  }
}

// ---------- Posts + feed ----------

interface PostRow {
  id: string;
  coach_id: string;
  title: string;
  body: string;
  image_url: string | null;
  created_at: number;
  coach_name?: string | null;
  coach_username?: string | null;
  profile_json?: string | null;
}

function toPost(r: PostRow): CoachPost {
  return {
    id: r.id,
    coachId: r.coach_id,
    coachName:
      r.coach_name !== undefined ? resolveName(r.coach_name ?? null, parseProfile(r.profile_json ?? null)) : undefined,
    coachUsername: r.coach_username,
    title: r.title,
    body: r.body,
    imageUrl: r.image_url,
    createdAt: r.created_at,
  };
}

export async function listPosts(coachId: string, limit = 20): Promise<CoachPost[]> {
  const rows = await query<PostRow>(
    'SELECT * FROM coach_posts WHERE coach_id = ? ORDER BY created_at DESC LIMIT ?',
    [coachId, limit],
  );
  return rows.map(toPost);
}

export async function createPost(
  coachId: string,
  title: string,
  body: string,
  imageUrl?: string,
): Promise<void> {
  await execute(
    'INSERT INTO coach_posts (id, coach_id, title, body, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuid(), coachId, title, body, imageUrl ?? null, Date.now()],
  );
}

export async function deletePost(coachId: string, id: string): Promise<void> {
  await execute('DELETE FROM coach_posts WHERE id = ? AND coach_id = ?', [id, coachId]);
}

// Feed = posts from coaches the athlete follows, newest first.
export async function feedForAthlete(athleteId: string, limit = 40): Promise<CoachPost[]> {
  const rows = await query<PostRow>(
    `SELECT p.*, c.name AS coach_name, c.username AS coach_username, c.profile_json
       FROM coach_posts p
       JOIN coach_follows f ON f.coach_id = p.coach_id
       JOIN coaches c ON c.id = p.coach_id
      WHERE f.athlete_id = ? AND c.banned = false
      ORDER BY p.created_at DESC
      LIMIT ?`,
    [athleteId, limit],
  );
  return rows.map(toPost);
}

// ---------- Follows ----------

export async function followCoach(athleteId: string, coachId: string): Promise<void> {
  await execute(
    `INSERT INTO coach_follows (athlete_id, coach_id, created_at) VALUES (?, ?, ?)
     ON CONFLICT (athlete_id, coach_id) DO NOTHING`,
    [athleteId, coachId, Date.now()],
  );
}

export async function unfollowCoach(athleteId: string, coachId: string): Promise<void> {
  await execute('DELETE FROM coach_follows WHERE athlete_id = ? AND coach_id = ?', [
    athleteId,
    coachId,
  ]);
}

export async function isFollowing(athleteId: string, coachId: string): Promise<boolean> {
  const row = await queryOne(
    'SELECT 1 AS one FROM coach_follows WHERE athlete_id = ? AND coach_id = ?',
    [athleteId, coachId],
  );
  return !!row;
}

export async function listFollowedCoaches(athleteId: string): Promise<CoachCard[]> {
  const rows = await query<CoachRow>(
    `SELECT ${AGG_SELECT}
       FROM coach_follows f
       JOIN coaches c ON c.id = f.coach_id
      WHERE f.athlete_id = ? AND c.username IS NOT NULL AND c.banned = false
      ORDER BY f.created_at DESC`,
    [RISING_SINCE(), athleteId],
  );
  return rows.map(toCard);
}

// ---------- Reports ----------

export async function createReport(
  reporterId: string | null,
  reporterRole: 'athlete' | 'coach',
  targetType: 'coach' | 'review',
  targetId: string,
  reason: string,
): Promise<void> {
  await execute(
    `INSERT INTO reports (id, reporter_id, reporter_role, target_type, target_id, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
    [uuid(), reporterId, reporterRole, targetType, targetId, reason, Date.now()],
  );
}

export async function listReports(status: ReportStatus = 'open'): Promise<Report[]> {
  const rows = await query<{
    id: string;
    reporter_id: string | null;
    reporter_role: string;
    target_type: string;
    target_id: string;
    reason: string;
    status: string;
    created_at: number;
    resolved_at: number | null;
  }>('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC', [status]);
  return rows.map((r) => ({
    id: r.id,
    reporterId: r.reporter_id,
    reporterRole: r.reporter_role as 'athlete' | 'coach',
    targetType: r.target_type as 'coach' | 'review',
    targetId: r.target_id,
    reason: r.reason,
    status: r.status as ReportStatus,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  }));
}

export async function resolveReport(id: string, status: 'resolved' | 'dismissed'): Promise<void> {
  await execute('UPDATE reports SET status = ?, resolved_at = ? WHERE id = ?', [
    status,
    Date.now(),
    id,
  ]);
}
