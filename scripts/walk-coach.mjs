// Walk the coach-console loop end-to-end against a RUNNING dev server
// (mirrors walk-loop.mjs / walk-readiness.mjs). Seeds a client straight into
// the db, then exercises: coach login → roster add → first pass → approve
// (program actually changes) → coached athlete logs (routes to queue, no
// self-serve adaptations) → second coach is locked out (403/404).
//
//   node scripts/walk-coach.mjs   (dev server on :3000, default db path)

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const DB_PATH = process.env.DATABASE_PATH ?? './data/coach.db';

const CLIENT_EMAIL = 'walk-client@test.local';
const COACH_EMAIL = 'walk-coach@test.local';
const RIVAL_EMAIL = 'walk-rival-coach@test.local';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

function cookieOf(res) {
  const all = res.headers.getSetCookie?.() ?? [];
  return all.map((c) => c.split(';')[0]).join('; ');
}

async function api(path, { method = 'GET', cookie = '', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.clone().json();
  } catch {
    data = await res.text();
  }
  return { res, data, cookie: cookieOf(res) };
}

// ---------- Seed a realistic client directly in the db ----------
// One throwaway request first so the server runs ensureSchema/migrations
// before this script opens the db file directly.
await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'walk-schema-init@test.local' },
});

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

for (const email of [CLIENT_EMAIL, COACH_EMAIL, RIVAL_EMAIL]) {
  const a = db.prepare('SELECT id FROM athletes WHERE email = ?').get(email);
  if (a) db.prepare('DELETE FROM athletes WHERE id = ?').run(a.id);
  const c = db.prepare('SELECT id FROM coaches WHERE email = ?').get(email);
  if (c) db.prepare('DELETE FROM coaches WHERE id = ?').run(c.id);
}

const athleteId = randomUUID();
const profile = {
  name: 'Walk Client',
  email: CLIENT_EMAIL,
  age: 28,
  sex: 'female',
  bodyweight: 70,
  unit: 'kg',
  height: '170cm',
  experience: 'intermediate',
  currentMaxes: { squat: 140, bench: 80, deadlift: 170 },
  squatStyle: 'low_bar',
  deadliftStance: 'conventional',
  benchGrip: 'medium',
  equipment: 'raw',
  trainingDaysPerWeek: 4,
  goal: 'total_max',
  meetDate: null,
  injuries: '',
  dietaryRestrictions: ['none'],
  phaseGoal: 'maintaining',
  mealsPerDay: 3,
};
db.prepare(
  'INSERT INTO athletes (id, email, name, profile_json, created_at) VALUES (?, ?, ?, ?, ?)',
).run(athleteId, CLIENT_EMAIL, 'Walk Client', JSON.stringify(profile), Date.now());

const program = {
  name: 'Walk Block',
  athlete: 'Walk Client',
  currentBlock: 'Strength',
  totalWeeks: 2,
  weeks: [1, 2].map((weekNumber) => ({
    weekNumber,
    blockName: 'Strength',
    theme: 'volume',
    days: [
      {
        dayNumber: 1,
        dayName: 'Squat day',
        exercises: [
          {
            name: 'Competition Squat',
            sets: 4,
            reps: 5,
            targetRPE: 7,
            estimatedWeight: weekNumber === 1 ? 110 : 120,
            unit: 'kg',
            isCompetitionLift: true,
          },
        ],
      },
    ],
  })),
};
db.prepare(
  'INSERT INTO programs (id, athlete_id, program_json, current_week, current_block, created_at) VALUES (?, ?, ?, 1, ?, ?)',
).run(randomUUID(), athleteId, JSON.stringify(program), 'Strength', Date.now());

const today = new Date().toISOString().slice(0, 10);
db.prepare(
  'INSERT INTO session_logs (id, athlete_id, date, week_number, day_number, exercises_json, created_at) VALUES (?, ?, ?, 1, 1, ?, ?)',
).run(
  randomUUID(),
  athleteId,
  today,
  JSON.stringify([
    { exercise: 'Competition Squat', sets: [{ reps: 5, weight: 130, actualRPE: 8 }] },
  ]),
  Date.now(),
);
console.log(`Seeded client ${athleteId} (${CLIENT_EMAIL})\n`);

// ---------- The walk ----------
const login = await api('/api/coach/auth/login', {
  method: 'POST',
  body: { email: COACH_EMAIL, name: 'Walk Coach' },
});
check('coach login', login.res.ok && !!login.cookie);
const coachCookie = login.cookie;

const roster = await api('/api/coach/roster', {
  method: 'POST',
  cookie: coachCookie,
  body: { clients: [{ email: CLIENT_EMAIL }] },
});
check('roster add links existing client', roster.res.ok && roster.data.added === 1);

const gen = await api('/api/coach/suggestions', {
  method: 'POST',
  cookie: coachCookie,
  body: { athleteId },
});
check('first pass generates suggestions', gen.res.ok && gen.data.created >= 1, `created=${gen.data.created}`);

const triagePage = await api('/coach', { cookie: coachCookie });
check(
  'triage page renders the client',
  triagePage.res.ok && String(triagePage.data).includes('Walk Client'),
);

const clientPage = await api(`/coach/clients/${athleteId}`, { cookie: coachCookie });
check(
  'client page renders the approval queue',
  clientPage.res.ok && String(clientPage.data).includes('Approval queue'),
);

const pending = db
  .prepare("SELECT id, payload_json FROM coach_suggestions WHERE athlete_id = ? AND status = 'pending'")
  .all(athleteId);
check('pending rows persisted', pending.length >= 1, `${pending.length} pending`);

const payload = JSON.parse(pending[0].payload_json);
const approve = await api('/api/coach/suggestions', {
  method: 'PATCH',
  cookie: coachCookie,
  body: { id: pending[0].id, action: 'approve', weight: payload.suggestedWeight + 2.5 },
});
check('approve with edited weight', approve.res.ok && approve.data.status === 'approved');

const progRow = db
  .prepare('SELECT program_json FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1')
  .get(athleteId);
const updated = JSON.parse(progRow.program_json);
const target = updated.weeks
  .find((w) => w.weekNumber === payload.weekNumber)
  ?.days.find((d) => d.dayNumber === payload.dayNumber)
  ?.exercises.find((e) => e.name === payload.exerciseName);
check(
  'approved weight applied to program',
  target?.estimatedWeight === payload.suggestedWeight + 2.5,
  `program now ${target?.estimatedWeight} ${payload.unit}`,
);

// Coached athlete logs a session → adaptations route to the coach, not the UI.
const athleteLogin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: CLIENT_EMAIL },
});
const athleteCookie = athleteLogin.cookie;
const logRes = await api('/api/session/log', {
  method: 'POST',
  cookie: athleteCookie,
  body: {
    date: today,
    weekNumber: 1,
    dayNumber: 1,
    exercises: [
      { exercise: 'Competition Squat', sets: [{ reps: 5, weight: 132.5, actualRPE: 8.5 }] },
    ],
  },
});
check(
  'coached log: coachReview flag + no self-serve adaptations',
  logRes.res.ok &&
    logRes.data.coachReview === true &&
    (logRes.data.handoff?.adaptations ?? []).length === 0,
);
const requeued = db
  .prepare("SELECT COUNT(*) AS n FROM coach_suggestions WHERE athlete_id = ? AND status = 'pending'")
  .get(athleteId);
check('coached log refills the pending queue', requeued.n >= 1, `${requeued.n} pending`);

// ---------- Tenant isolation: a second coach must be locked out ----------
const rival = await api('/api/coach/auth/login', {
  method: 'POST',
  body: { email: RIVAL_EMAIL, name: 'Rival Coach' },
});
const rivalCookie = rival.cookie;
const rivalGen = await api('/api/coach/suggestions', {
  method: 'POST',
  cookie: rivalCookie,
  body: { athleteId },
});
check('rival coach cannot generate (403)', rivalGen.res.status === 403);
const rivalPage = await api(`/coach/clients/${athleteId}`, { cookie: rivalCookie });
check('rival coach cannot view client (404)', rivalPage.res.status === 404);
const rivalPending = db
  .prepare("SELECT id FROM coach_suggestions WHERE athlete_id = ? AND status = 'pending'")
  .get(athleteId);
const rivalPatch = await api('/api/coach/suggestions', {
  method: 'PATCH',
  cookie: rivalCookie,
  body: { id: rivalPending.id, action: 'approve' },
});
check('rival coach cannot approve (404)', rivalPatch.res.status === 404);
const noCookie = await api('/api/coach/roster', {
  method: 'POST',
  body: { clients: [{ email: 'x@y.z' }] },
});
check('anonymous roster write rejected (401)', noCookie.res.status === 401);

db.close();
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
