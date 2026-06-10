import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTriage, type TriageInput } from '../src/lib/triage';
import type { DecisionFinding } from '../src/lib/types';

function input(overrides: Partial<TriageInput> = {}): TriageInput {
  return {
    athleteId: 'a1',
    name: 'Sarah',
    email: 'sarah@example.com',
    findings: [],
    daysSinceLastSession: 1,
    pendingSuggestions: 0,
    ...overrides,
  };
}

function finding(severity: DecisionFinding['severity']): DecisionFinding {
  return {
    rule: 'x',
    lift: 'squat',
    severity,
    title: `${severity} finding`,
    detail: 'detail',
    action: 'action',
  };
}

test('ranking: caution outranks suggest outranks info', () => {
  const items = buildTriage([
    input({ athleteId: 'a', name: 'A', findings: [finding('info')] }),
    input({ athleteId: 'b', name: 'B', findings: [finding('caution')] }),
    input({ athleteId: 'c', name: 'C', findings: [finding('suggest')] }),
  ]);
  assert.deepEqual(
    items.map((i) => i.athleteId),
    ['b', 'c', 'a'],
  );
});

test('stale clients get a caution flag and score; recent ones do not', () => {
  const [stale] = buildTriage([input({ daysSinceLastSession: 9 })]);
  assert.equal(stale.flags.length, 1);
  assert.equal(stale.flags[0].severity, 'caution');
  assert.match(stale.flags[0].title, /9 days/);
  assert.ok(stale.score >= 3);

  const [fresh] = buildTriage([input({ daysSinceLastSession: 2 })]);
  assert.equal(fresh.flags.length, 0);
  assert.equal(fresh.score, 0);
});

test('never-trained clients get an info flag, not a stale caution', () => {
  const [never] = buildTriage([input({ daysSinceLastSession: null })]);
  assert.equal(never.flags.length, 1);
  assert.equal(never.flags[0].severity, 'info');
  assert.equal(never.score, 1);
});

test('pending suggestions nudge the score but cap at 3', () => {
  const [few] = buildTriage([input({ pendingSuggestions: 2 })]);
  assert.equal(few.score, 2);
  const [many] = buildTriage([input({ pendingSuggestions: 10 })]);
  assert.equal(many.score, 3);
});

test('ties break alphabetically by name', () => {
  const items = buildTriage([
    input({ athleteId: 'z', name: 'Zoe' }),
    input({ athleteId: 'a', name: 'Adam' }),
  ]);
  assert.deepEqual(
    items.map((i) => i.name),
    ['Adam', 'Zoe'],
  );
});
