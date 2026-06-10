import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLoadSuggestion,
  bestOneRms,
  generateLoadSuggestions,
  personalizeWeek,
} from '../src/lib/suggestions';
import type {
  AthleteProfile,
  LoadSuggestionPayload,
  Program,
  ProgramWeek,
  SessionLog,
} from '../src/lib/types';

function profile(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    name: 'Sarah',
    email: 'sarah@example.com',
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
    ...overrides,
  };
}

function program(): Program {
  return {
    name: 'Block 1',
    athlete: 'Sarah',
    currentBlock: 'Strength',
    totalWeeks: 2,
    weeks: [
      {
        weekNumber: 1,
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
                estimatedWeight: 110,
                unit: 'kg',
                isCompetitionLift: true,
              },
            ],
          },
        ],
      },
      {
        weekNumber: 2,
        blockName: 'Strength',
        theme: 'intensity',
        days: [
          {
            dayNumber: 1,
            dayName: 'Squat day',
            exercises: [
              {
                name: 'Competition Squat',
                sets: 3,
                reps: 3,
                targetRPE: 8,
                estimatedWeight: 120,
                unit: 'kg',
                isCompetitionLift: true,
              },
            ],
          },
        ],
      },
    ],
  };
}

function log(date: string, weight: number, reps: number, rpe: number): SessionLog {
  return {
    id: '',
    athleteId: 'a1',
    date,
    weekNumber: 1,
    dayNumber: 1,
    exercises: [{ exercise: 'Competition Squat', sets: [{ reps, weight, actualRPE: rpe }] }],
    createdAt: 0,
  };
}

test('generateLoadSuggestions: history-driven change carries occurrence coords', () => {
  // A strong logged session (vs the 110 planned) should move the week-2 target.
  const out = generateLoadSuggestions({
    program: program(),
    profile: profile(),
    logs: [log('2026-06-08', 130, 5, 8)],
    fromWeek: 1,
    fromDay: 1,
    lifts: ['squat'],
  });
  assert.equal(out.length, 1);
  const s = out[0];
  assert.equal(s.lift, 'squat');
  assert.equal(s.exerciseName, 'Competition Squat');
  assert.equal(s.weekNumber, 2); // strictly after (1,1) → week 2 occurrence
  assert.equal(s.dayNumber, 1);
  assert.ok(s.suggestedWeight > 0);
  assert.notEqual(s.suggestedWeight, s.plannedWeight);
});

test('generateLoadSuggestions: no history and no change → nothing queued', () => {
  // No logs: the engine falls back to the profile 1RM; if that lands exactly on
  // plan it must NOT queue noise. Use a profile-less max to force 'planned'.
  const p = profile({ currentMaxes: { squat: null, bench: null, deadlift: null } });
  const out = generateLoadSuggestions({
    program: program(),
    profile: p,
    logs: [],
    fromWeek: null,
    fromDay: null,
    lifts: ['squat'],
  });
  assert.equal(out.length, 0);
});

test('applyLoadSuggestion: applies to the right occurrence without mutating input', () => {
  const prog = program();
  const payload: LoadSuggestionPayload = {
    lift: 'squat',
    exerciseName: 'Competition Squat',
    weekNumber: 2,
    dayNumber: 1,
    dayName: 'Squat day',
    plannedWeight: 120,
    suggestedWeight: 127.5,
    reason: 'test',
    deload: false,
    unit: 'kg',
  };
  const { program: next, applied } = applyLoadSuggestion(prog, payload, 125);
  assert.equal(applied, true);
  assert.equal(next.weeks[1].days[0].exercises[0].estimatedWeight, 125);
  // Original untouched; week 1 untouched.
  assert.equal(prog.weeks[1].days[0].exercises[0].estimatedWeight, 120);
  assert.equal(next.weeks[0].days[0].exercises[0].estimatedWeight, 110);
});

test('applyLoadSuggestion: missing exercise reports applied=false', () => {
  const payload: LoadSuggestionPayload = {
    lift: 'bench',
    exerciseName: 'Larsen Press',
    weekNumber: 1,
    dayNumber: 1,
    dayName: 'Squat day',
    plannedWeight: 0,
    suggestedWeight: 60,
    reason: 'test',
    deload: false,
    unit: 'kg',
  };
  const { applied } = applyLoadSuggestion(program(), payload, 60);
  assert.equal(applied, false);
});

test('bestOneRms: logged e1RM beats a stale stated max', () => {
  // 150x3 @ RPE9 is an e1RM well above the stated 140.
  const rms = bestOneRms(profile(), [log('2026-06-08', 150, 3, 9)]);
  assert.ok((rms.squat ?? 0) > 140);
  assert.equal(rms.bench, 80); // no bench logs → stated max stands
});

test('personalizeWeek: %1RM wins, RPE chart otherwise, no e1RM → no weight', () => {
  const template: ProgramWeek = {
    weekNumber: 0,
    blockName: 'Test',
    theme: '',
    days: [
      {
        dayNumber: 1,
        dayName: 'Day 1',
        exercises: [
          { name: 'Competition Squat', sets: 4, reps: 5, targetRPE: 7, percentageOfMax: 80 },
          { name: 'Competition Bench', sets: 5, reps: 3, targetRPE: 8 },
          { name: 'Lat Pulldown', sets: 3, reps: 12, targetRPE: 7 },
        ],
      },
    ],
  };
  const week = personalizeWeek(template, { squat: 140, bench: 80, deadlift: 170 }, 'kg');
  const [squat, bench, accessory] = week.days[0].exercises;
  assert.equal(squat.estimatedWeight, 112.5); // 140 × 0.80 = 112 → plate-rounded
  assert.ok((bench.estimatedWeight ?? 0) > 0); // reps×RPE chart path
  assert.ok((bench.estimatedWeight ?? 0) < 80);
  assert.equal(accessory.estimatedWeight, undefined); // unknown lift → lifter's call
});
