import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readinessModifier, readinessScore } from '../src/lib/readiness';

test('green: all dials good → no cap', () => {
  const a = readinessModifier({ sleep: 9, energy: 8, soreness: 2, stress: 2 });
  assert.equal(a.flag, 'green');
  assert.equal(a.rpeCap, null);
  assert.equal(a.seePtAdvice, false);
  assert.ok(a.score >= 67);
});

test('amber: middling dials → soft cap RPE 8', () => {
  const a = readinessModifier({ sleep: 6, energy: 6, soreness: 5, stress: 5 });
  assert.equal(a.flag, 'amber');
  assert.equal(a.rpeCap, 8);
});

test('red: wrecked dials → soft cap RPE 7, still a cap not a forced deload', () => {
  const a = readinessModifier({ sleep: 2, energy: 2, soreness: 9, stress: 9 });
  assert.equal(a.flag, 'red');
  assert.equal(a.rpeCap, 7);
  // The cap is a number the lifter can ignore, never a prescription below it.
  assert.ok(a.rpeCap >= 7);
  assert.match(a.headline.toLowerCase(), /cap|rough/);
});

test('acute pain escalates the flag and routes to a PT', () => {
  const a = readinessModifier({ sleep: 9, energy: 8, soreness: 2, stress: 2, pain: 8 });
  assert.equal(a.flag, 'red'); // escalated despite good dials
  assert.equal(a.seePtAdvice, true);
  assert.match(a.suggestions[0].toLowerCase(), /pt|doctor|sports-med/);
});

test('moderate pain flags a PT without forcing a red day', () => {
  const a = readinessModifier({ sleep: 9, energy: 8, soreness: 2, stress: 2, pain: 5 });
  assert.equal(a.seePtAdvice, true);
  assert.equal(a.flag, 'green'); // pain 5 < 6 → no escalation
});

test('score is monotonic: better inputs never score lower', () => {
  const lo = readinessScore({ sleep: 3, energy: 3, soreness: 8, stress: 8 });
  const hi = readinessScore({ sleep: 9, energy: 9, soreness: 1, stress: 1 });
  assert.ok(hi > lo);
  assert.ok(lo >= 0 && hi <= 100);
});

test('out-of-range dials are clamped, not trusted blindly', () => {
  const a = readinessModifier({ sleep: 99, energy: 99, soreness: -5, stress: -5 });
  assert.equal(a.flag, 'green');
  assert.ok(a.score <= 100);
});
