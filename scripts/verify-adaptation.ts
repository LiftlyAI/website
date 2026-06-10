// Does the program actually adapt? Drives the REAL engine modules against the
// live dev DB. Step 2 inserts a much heavier squat inside a transaction and
// ROLLS BACK, so the database is never mutated — we only read the engine's
// reaction. Run: npx tsx scripts/verify-adaptation.ts
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { computeHandoff } from '../src/lib/handoff';
import { computeWeeklyReview } from '../src/lib/review-data';
import { readinessModifier } from '../src/lib/readiness';
import type { AthleteProfile } from '../src/lib/types';

const ATHLETE = process.env.ATHLETE || 'be6e03a5-ea10-4a6c-8fb8-7d24e53063e3';
const db = new Database('./data/coach.db');

const profile = JSON.parse(
  (db.prepare('SELECT profile_json FROM athletes WHERE id = ?').get(ATHLETE) as { profile_json: string }).profile_json,
) as AthleteProfile;
const u = profile.unit;
console.log(`\nAthlete unit: ${u} | stated maxes: S${profile.currentMaxes.squat} B${profile.currentMaxes.bench} D${profile.currentMaxes.deadlift}\n`);

const fmt = (label: string, h: { adaptations: { exerciseName: string; plannedWeight: number; suggestedWeight: number; changed: boolean; reason: string }[] }) => {
  console.log(label);
  for (const a of h.adaptations) {
    console.log(`  ${a.exerciseName.padEnd(22)} planned ${String(a.plannedWeight).padStart(4)}${u} -> suggested ${String(a.suggestedWeight).padStart(4)}${u}  changed=${a.changed}`);
    console.log(`     ${a.reason}`);
  }
  if (h.adaptations.length === 0) console.log('  (no adaptations)');
};

// 1) Baseline — what the engine recommends right now from existing logs.
console.log('=== 1. AUTOREGULATION: current next-session targets ===');
fmt('BASELINE', computeHandoff(db, ATHLETE, ['squat', 'bench', 'deadlift'], null, null));

// 2) Sensitivity — log a much heavier squat, recompute, then roll back.
console.log('\n=== 2. DYNAMIC RESPONSE: log a heavier squat (then rollback) ===');
const heavy = Math.round((profile.currentMaxes.squat ?? 140) * 1.15);
db.exec('BEGIN');
db.prepare(
  'INSERT INTO session_logs (id, athlete_id, date, week_number, day_number, exercises_json, notes, bodyweight, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
).run(
  randomUUID(),
  ATHLETE,
  new Date().toISOString().slice(0, 10),
  null,
  null,
  JSON.stringify([{ exercise: 'Competition Squat', sets: [{ reps: 3, weight: heavy, actualRPE: 8 }] }]),
  'verify harness',
  null,
  Date.now(),
);
console.log(`(logged Competition Squat ${heavy}${u} x3 @8)`);
fmt('AFTER NEW LOG', computeHandoff(db, ATHLETE, ['squat'], null, null));
db.exec('ROLLBACK');

// Prove the rollback worked — baseline squat target is unchanged.
const after = computeHandoff(db, ATHLETE, ['squat'], null, null).adaptations[0];
console.log(`Post-rollback squat target back to: ${after ? after.suggestedWeight + u : 'n/a'} (DB untouched)\n`);

// 3) Phase 4 — weekly review + decision findings on the real data.
console.log('=== 3. WEEKLY REVIEW + DECISION FINDINGS (real data) ===');
const review = computeWeeklyReview(db, ATHLETE);
if (review) {
  console.log(`Sessions planned/actual: ${review.sessions.planned}/${review.sessions.actual}`);
  for (const r of review.rows) console.log(`  ${r.label.padEnd(16)} planned ${r.planned.padEnd(12)} actual ${r.actual}  onTrack=${r.onTrack}`);
  console.log(`Findings (${review.findings.length}):`);
  for (const f of review.findings) console.log(`  [${f.severity}] ${f.title} -> ${f.action}`);
  console.log(`Sunday tweak: ${review.sundayTweak}`);
} else {
  console.log('(no program → no review)');
}

// 4) Phase 3 — readiness soft override on three sample days.
console.log('\n=== 4. READINESS SOFT OVERRIDE (samples) ===');
for (const [name, input] of [
  ['fresh', { sleep: 9, energy: 8, soreness: 2, stress: 2 }],
  ['rough', { sleep: 4, energy: 4, soreness: 7, stress: 6 }],
  ['knee pain', { sleep: 8, energy: 7, soreness: 3, stress: 3, pain: 7 }],
] as const) {
  const a = readinessModifier(input);
  console.log(`  ${name.padEnd(10)} flag=${a.flag.padEnd(5)} softCap=${a.rpeCap ?? 'none'}  seePT=${a.seePtAdvice}`);
}
console.log('');
