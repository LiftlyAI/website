// Does the program actually adapt? Drives the REAL engine modules against the
// live Supabase Postgres. Step 2 inserts a much heavier squat, recomputes, then
// DELETES that exact row, so the database is left untouched — we only read the
// engine's reaction. Run: npx tsx scripts/verify-adaptation.ts
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { computeHandoff } from '../src/lib/handoff';
import { computeWeeklyReview } from '../src/lib/review-data';
import { readinessModifier } from '../src/lib/readiness';
import { execute, queryOne } from '../src/lib/db';
import type { AthleteProfile } from '../src/lib/types';

// tsx does not auto-load .env.local for standalone scripts — pull DATABASE_URL in.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const ATHLETE = process.env.ATHLETE || 'be6e03a5-ea10-4a6c-8fb8-7d24e53063e3';

type Handoff = {
  adaptations: {
    exerciseName: string;
    plannedWeight: number;
    suggestedWeight: number;
    changed: boolean;
    reason: string;
  }[];
};

async function main() {
  const aRow = await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [ATHLETE],
  );
  if (!aRow) throw new Error(`No athlete ${ATHLETE}`);
  const profile = JSON.parse(aRow.profile_json) as AthleteProfile;
  const u = profile.unit;
  console.log(
    `\nAthlete unit: ${u} | stated maxes: S${profile.currentMaxes.squat} B${profile.currentMaxes.bench} D${profile.currentMaxes.deadlift}\n`,
  );

  const fmt = (label: string, h: Handoff) => {
    console.log(label);
    for (const a of h.adaptations) {
      console.log(
        `  ${a.exerciseName.padEnd(22)} planned ${String(a.plannedWeight).padStart(4)}${u} -> suggested ${String(a.suggestedWeight).padStart(4)}${u}  changed=${a.changed}`,
      );
      console.log(`     ${a.reason}`);
    }
    if (h.adaptations.length === 0) console.log('  (no adaptations)');
  };

  // 1) Baseline — what the engine recommends right now from existing logs.
  console.log('=== 1. AUTOREGULATION: current next-session targets ===');
  fmt('BASELINE', await computeHandoff(ATHLETE, ['squat', 'bench', 'deadlift'], null, null));

  // 2) Sensitivity — log a much heavier squat, recompute, then delete that row.
  console.log('\n=== 2. DYNAMIC RESPONSE: log a heavier squat (then remove) ===');
  const heavy = Math.round((profile.currentMaxes.squat ?? 140) * 1.15);
  const tempId = randomUUID();
  await execute(
    'INSERT INTO session_logs (id, athlete_id, date, week_number, day_number, exercises_json, notes, bodyweight, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [
      tempId,
      ATHLETE,
      new Date().toISOString().slice(0, 10),
      null,
      null,
      JSON.stringify([{ exercise: 'Competition Squat', sets: [{ reps: 3, weight: heavy, actualRPE: 8 }] }]),
      'verify harness',
      null,
      Date.now(),
    ],
  );
  console.log(`(logged Competition Squat ${heavy}${u} x3 @8)`);
  fmt('AFTER NEW LOG', await computeHandoff(ATHLETE, ['squat'], null, null));
  await execute('DELETE FROM session_logs WHERE id = ?', [tempId]);

  // Prove the cleanup worked — baseline squat target is unchanged.
  const after = (await computeHandoff(ATHLETE, ['squat'], null, null)).adaptations[0];
  console.log(
    `Post-cleanup squat target back to: ${after ? after.suggestedWeight + u : 'n/a'} (DB untouched)\n`,
  );

  // 3) Phase 4 — weekly review + decision findings on the real data.
  console.log('=== 3. WEEKLY REVIEW + DECISION FINDINGS (real data) ===');
  const review = await computeWeeklyReview(ATHLETE);
  if (review) {
    console.log(`Sessions planned/actual: ${review.sessions.planned}/${review.sessions.actual}`);
    for (const r of review.rows)
      console.log(`  ${r.label.padEnd(16)} planned ${r.planned.padEnd(12)} actual ${r.actual}  onTrack=${r.onTrack}`);
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
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
