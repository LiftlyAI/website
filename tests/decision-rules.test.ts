import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDecisions,
  ruleSorenessStreak,
  ruleVideoFlaw,
  rulePlateau,
  ruleVelocityDrop,
  type DecisionContext,
} from '../src/lib/decision-rules';

const base: DecisionContext = {
  today: '2026-06-09',
  unit: 'lbs',
  readiness: [],
  formChecks: [],
  sessionsByLift: { squat: [], bench: [], deadlift: [] },
  blockName: 'Hypertrophy',
};

test('soreness streak: two high-soreness days fires; one day does not', () => {
  const two = ruleSorenessStreak({
    ...base,
    readiness: [
      { date: '2026-06-09', soreness: 8, pain: null },
      { date: '2026-06-08', soreness: 7, pain: null },
    ],
  });
  assert.ok(two);
  assert.equal(two!.rule, 'soreness-streak');
  assert.equal(two!.severity, 'suggest');

  const one = ruleSorenessStreak({
    ...base,
    readiness: [{ date: '2026-06-09', soreness: 9, pain: null }],
  });
  assert.equal(one, null);

  const mixed = ruleSorenessStreak({
    ...base,
    readiness: [
      { date: '2026-06-09', soreness: 8, pain: null },
      { date: '2026-06-08', soreness: 4, pain: null },
    ],
  });
  assert.equal(mixed, null);
});

test('video flaw: same fault in ≥2 clips of a lift → targeted drill', () => {
  const f = ruleVideoFlaw({
    ...base,
    formChecks: [
      { date: '2026-06-08', lift: 'squat', formNotes: ['knees caved on the last rep'], velocityLossPct: null },
      { date: '2026-06-05', lift: 'squat', formNotes: ['slight knee cave out of the hole'], velocityLossPct: null },
    ],
  });
  assert.ok(f);
  assert.equal(f!.lift, 'squat');
  assert.equal(f!.rule, 'video-flaw');
  assert.match(f!.action.toLowerCase(), /tempo|drill|knee/);

  const oneOff = ruleVideoFlaw({
    ...base,
    formChecks: [
      { date: '2026-06-08', lift: 'squat', formNotes: ['knees caved'], velocityLossPct: null },
    ],
  });
  assert.equal(oneOff, null);
});

test('plateau: flat e1RM across ≥3 sessions fires; progress does not', () => {
  const flat = rulePlateau({
    ...base,
    sessionsByLift: {
      bench: [
        { date: '2026-05-01', e1rm: 225 },
        { date: '2026-05-15', e1rm: 225 },
        { date: '2026-06-01', e1rm: 224 },
      ],
    },
  });
  assert.ok(flat);
  assert.equal(flat!.lift, 'bench');
  assert.equal(flat!.severity, 'caution');

  const climbing = rulePlateau({
    ...base,
    sessionsByLift: {
      bench: [
        { date: '2026-05-01', e1rm: 225 },
        { date: '2026-05-15', e1rm: 235 },
        { date: '2026-06-01', e1rm: 245 },
      ],
    },
  });
  assert.equal(climbing, null);

  const tooFew = rulePlateau({
    ...base,
    sessionsByLift: { bench: [{ date: '2026-05-01', e1rm: 225 }] },
  });
  assert.equal(tooFew, null);
});

test('velocity drop: ≥30% slowdown on the latest clip caps the set', () => {
  const drop = ruleVelocityDrop({
    ...base,
    formChecks: [{ date: '2026-06-08', lift: 'deadlift', formNotes: [], velocityLossPct: 38 }],
  });
  assert.ok(drop);
  assert.equal(drop!.lift, 'deadlift');
  assert.equal(drop!.severity, 'caution');

  const fine = ruleVelocityDrop({
    ...base,
    formChecks: [{ date: '2026-06-08', lift: 'deadlift', formNotes: [], velocityLossPct: 18 }],
  });
  assert.equal(fine, null);
});

test('evaluateDecisions composes and sorts caution before suggest', () => {
  const findings = evaluateDecisions({
    ...base,
    readiness: [
      { date: '2026-06-09', soreness: 8, pain: null },
      { date: '2026-06-08', soreness: 8, pain: null },
    ],
    sessionsByLift: {
      squat: [
        { date: '2026-05-01', e1rm: 315 },
        { date: '2026-05-15', e1rm: 315 },
        { date: '2026-06-01', e1rm: 314 },
      ],
    },
  });
  assert.ok(findings.length >= 2);
  assert.equal(findings[0].severity, 'caution'); // plateau outranks soreness suggestion
  assert.ok(findings.some((f) => f.rule === 'soreness-streak'));
  assert.ok(findings.some((f) => f.rule === 'plateau'));
});

test('empty context produces no findings (no false positives)', () => {
  assert.deepEqual(evaluateDecisions(base), []);
});
