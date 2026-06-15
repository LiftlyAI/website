-- Powerlifting Coach — Supabase Postgres schema.
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. It mirrors the old better-sqlite3 schema. `created_at` columns
-- are millisecond epoch timestamps (BIGINT); `date` columns are 'YYYY-MM-DD'
-- text. All access is server-side under the app's own cookie auth, so RLS is
-- intentionally left off.

create table if not exists athletes (
  id           text primary key,
  email        text unique not null,
  name         text,
  profile_json text,
  created_at   bigint not null
);

create table if not exists programs (
  id            text primary key,
  athlete_id    text not null references athletes(id) on delete cascade,
  program_json  text not null,
  current_week  integer not null default 1,
  current_block text,
  created_at    bigint not null
);

create table if not exists session_logs (
  id             text primary key,
  athlete_id     text not null references athletes(id) on delete cascade,
  date           text not null,
  week_number    integer,
  day_number     integer,
  exercises_json text not null,
  notes          text,
  bodyweight     double precision,
  created_at     bigint not null
);
create index if not exists idx_session_logs_athlete on session_logs(athlete_id, date);

create table if not exists form_checks (
  id             text primary key,
  athlete_id     text not null references athletes(id) on delete cascade,
  lift_type      text not null,
  video_path     text,
  frames_count   integer,
  user_context   text,
  ai_analysis    text,
  estimated_rpe  double precision,
  cv_json        text,
  rpe_confidence text,
  load_kg        double precision,
  created_at     bigint not null
);
create index if not exists idx_form_checks_athlete on form_checks(athlete_id, created_at);

create table if not exists velocity_log (
  id            text primary key,
  athlete_id    text not null references athletes(id) on delete cascade,
  form_check_id text references form_checks(id) on delete cascade,
  lift_type     text not null,
  load_kg       double precision,
  bodyweight_kg double precision,
  reps          integer,
  mcv_ms        double precision,
  slowdown_pct  double precision,
  actual_rpe    double precision,
  date          text not null,
  created_at    bigint not null
);
create index if not exists idx_velocity_log_athlete on velocity_log(athlete_id, lift_type, created_at);

create table if not exists chat_messages (
  id         text primary key,
  athlete_id text not null references athletes(id) on delete cascade,
  role       text not null,
  content    text not null,
  created_at bigint not null
);
create index if not exists idx_chat_messages_athlete on chat_messages(athlete_id, created_at);

create table if not exists bodyweight_logs (
  id         text primary key,
  athlete_id text not null references athletes(id) on delete cascade,
  date       text not null,
  bodyweight double precision not null,
  created_at bigint not null,
  unique(athlete_id, date)
);

create table if not exists meal_plans (
  id           text primary key,
  athlete_id   text not null references athletes(id) on delete cascade,
  plan_json    text not null,
  targets_json text not null,
  steer        text,
  created_at   bigint not null
);
create index if not exists idx_meal_plans_athlete on meal_plans(athlete_id, created_at);

create table if not exists readiness_logs (
  id         text primary key,
  athlete_id text not null references athletes(id) on delete cascade,
  date       text not null,
  sleep      integer not null,
  energy     integer not null,
  soreness   integer not null,
  stress     integer not null,
  pain       integer,
  pain_note  text,
  note       text,
  created_at bigint not null,
  unique(athlete_id, date)
);
create index if not exists idx_readiness_logs_athlete on readiness_logs(athlete_id, date);

-- B2B coach layer. A coach owns a roster via coach_athletes; coach_suggestions
-- is the human-in-the-loop queue: the engines propose, the coach approves/edits/
-- rejects, and only then does a coached athlete's program change. `coached_by` on
-- athletes routes a coached lifter's load changes through that approval queue
-- instead of applying directly.
alter table athletes add column if not exists coached_by text;

create table if not exists coaches (
  id         text primary key,
  email      text unique not null,
  name       text,
  created_at bigint not null
);

create table if not exists coach_athletes (
  coach_id   text not null references coaches(id) on delete cascade,
  athlete_id text not null references athletes(id) on delete cascade,
  status     text not null default 'active',
  created_at bigint not null,
  primary key (coach_id, athlete_id)
);

create table if not exists coach_suggestions (
  id            text primary key,
  coach_id      text not null references coaches(id) on delete cascade,
  athlete_id    text not null references athletes(id) on delete cascade,
  kind          text not null,
  payload_json  text not null,
  edited_weight double precision,
  status        text not null default 'pending',
  source        text,
  coach_note    text,
  created_at    bigint not null,
  resolved_at   bigint
);
create index if not exists idx_coach_suggestions_coach
  on coach_suggestions(coach_id, status, created_at);
create index if not exists idx_coach_suggestions_athlete
  on coach_suggestions(athlete_id, status, created_at);

-- Coaches Network (public marketplace layer). A coach becomes publicly listed by
-- claiming a `username`, filling in `profile_json` (bio/specialties/etc.) and
-- flipping `listed`. Athletes discover listed coaches, apply (coach_applications),
-- and on accept get linked through the SAME coach_athletes roster + coached_by
-- routing the console already uses. Reviews require a real coach<->athlete link.
alter table coaches add column if not exists username     text unique;
alter table coaches add column if not exists profile_json text;
alter table coaches add column if not exists listed       boolean not null default false;
alter table coaches add column if not exists featured     boolean not null default false;

-- Athlete -> coach intake. One open application per (coach, athlete); on accept
-- the roster link is created and status flips to 'accepted'.
create table if not exists coach_applications (
  id           text primary key,
  coach_id     text not null references coaches(id) on delete cascade,
  athlete_id   text not null references athletes(id) on delete cascade,
  status       text not null default 'pending', -- pending | accepted | rejected | waitlisted
  payload_json text not null,
  coach_note   text,
  created_at   bigint not null,
  resolved_at  bigint,
  unique (coach_id, athlete_id)
);
create index if not exists idx_coach_applications_coach
  on coach_applications(coach_id, status, created_at);

-- Verified-athlete reviews: only an athlete with a current/past roster link to
-- the coach may post, one review per (coach, athlete).
create table if not exists coach_reviews (
  id             text primary key,
  coach_id       text not null references coaches(id) on delete cascade,
  athlete_id     text not null references athletes(id) on delete cascade,
  rating         integer not null, -- overall 1-5
  communication  integer,
  programming    integer,
  meet_prep      integer,
  responsiveness integer,
  body           text,
  created_at     bigint not null,
  unique (coach_id, athlete_id)
);
create index if not exists idx_coach_reviews_coach
  on coach_reviews(coach_id, created_at);

-- Athlete "Save Coach" favourites.
create table if not exists coach_saves (
  athlete_id text not null references athletes(id) on delete cascade,
  coach_id   text not null references coaches(id) on delete cascade,
  created_at bigint not null,
  primary key (athlete_id, coach_id)
);

-- Coaches Network — trust, content, services and moderation layer.
-- Trust: admins (env ADMIN_EMAILS allowlist) flip coaches.verified and approve
-- individual credential submissions. banned hides a coach from discovery.
alter table coaches add column if not exists verified    boolean not null default false;
alter table coaches add column if not exists verified_at  bigint;
alter table coaches add column if not exists banned       boolean not null default false;
alter table coach_reviews add column if not exists hidden  boolean not null default false;
-- A coached athlete can share a form check with their coach for human feedback.
alter table form_checks add column if not exists shared_with_coach boolean not null default false;

-- Uploaded/claimed credentials, verified one-by-one by an admin.
create table if not exists coach_credentials (
  id           text primary key,
  coach_id     text not null references coaches(id) on delete cascade,
  title        text not null,
  issuer       text,
  document_url text,
  status       text not null default 'pending', -- pending | approved | rejected
  created_at   bigint not null,
  reviewed_at  bigint
);
create index if not exists idx_coach_credentials_coach on coach_credentials(coach_id, status);

-- Display-only service listings (no checkout). price is per `cadence`.
create table if not exists coach_services (
  id            text primary key,
  coach_id      text not null references coaches(id) on delete cascade,
  name          text not null,
  description   text,
  price         double precision,
  cadence       text not null default 'month', -- month | one-time | session
  features_json text,                           -- string[]
  sort_order    integer not null default 0,
  created_at    bigint not null
);
create index if not exists idx_coach_services_coach on coach_services(coach_id, sort_order);

-- Coach-authored showcase blocks: type 'result' (before/after, comp, record)
-- or 'athlete' (a coached lifter's stats). Shape lives in data_json per type.
create table if not exists coach_showcase (
  id         text primary key,
  coach_id   text not null references coaches(id) on delete cascade,
  type       text not null, -- result | athlete
  data_json  text not null,
  sort_order integer not null default 0,
  created_at bigint not null
);
create index if not exists idx_coach_showcase_coach on coach_showcase(coach_id, type, sort_order);

-- Coach content posts (training advice, meet recaps, spotlights).
create table if not exists coach_posts (
  id         text primary key,
  coach_id   text not null references coaches(id) on delete cascade,
  title      text not null,
  body       text not null,
  image_url  text,
  created_at bigint not null
);
create index if not exists idx_coach_posts_coach on coach_posts(coach_id, created_at);

-- Athlete -> coach content follow (separate from coach_saves bookmarks). Powers
-- the athlete feed, follower counts, and the "Rising Coaches" rail.
create table if not exists coach_follows (
  athlete_id text not null references athletes(id) on delete cascade,
  coach_id   text not null references coaches(id) on delete cascade,
  created_at bigint not null,
  primary key (athlete_id, coach_id)
);
create index if not exists idx_coach_follows_coach on coach_follows(coach_id, created_at);

-- Human form-review feedback a coach leaves on a shared form check.
create table if not exists coach_form_feedback (
  id            text primary key,
  form_check_id text not null references form_checks(id) on delete cascade,
  coach_id      text not null references coaches(id) on delete cascade,
  athlete_id    text not null references athletes(id) on delete cascade,
  feedback      text not null,
  created_at    bigint not null,
  unique (form_check_id)
);

-- Reports against a coach or a review; resolved in the admin console.
create table if not exists reports (
  id            text primary key,
  reporter_id   text,
  reporter_role text not null,           -- athlete | coach
  target_type   text not null,           -- coach | review
  target_id     text not null,
  reason        text not null,
  status        text not null default 'open', -- open | resolved | dismissed
  created_at    bigint not null,
  resolved_at   bigint
);
create index if not exists idx_reports_status on reports(status, created_at);

-- Billing + metering. One subscription row per billing account (athlete OR
-- coach); absence of a row == free. Form checks are counted from the
-- form_checks table directly (already the source of truth); usage_events meters
-- the "Gemini API key uses" (chat, program, nutrition generations). Plans:
-- 'free' (default, all features, metered), 'pro' ($12/mo or $99/yr), 'coach'
-- (a paying coach's active clients get the coach tier; coach billed per seat).
create table if not exists subscriptions (
  id                     text primary key,
  account_type           text not null,                 -- 'athlete' | 'coach'
  account_id             text not null,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free',   -- 'free' | 'pro' | 'coach'
  status                 text not null default 'inactive',
  quantity               integer not null default 1,     -- coach per-seat client count
  current_period_end     bigint,
  created_at             bigint not null,
  updated_at             bigint not null,
  unique(account_type, account_id)
);
create index if not exists idx_subscriptions_customer on subscriptions(stripe_customer_id);

create table if not exists usage_events (
  id           text primary key,
  account_type text not null,   -- 'athlete' | 'coach'
  account_id   text not null,
  kind         text not null,   -- 'ai_call'
  feature      text,            -- 'chat' | 'nutrition' | 'program' | 'onboarding'
  created_at   bigint not null
);
create index if not exists idx_usage_events_lookup
  on usage_events(account_type, account_id, kind, created_at);
