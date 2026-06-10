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
