import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAthletePlan,
  capsFor,
  isActiveStatus,
  startOfIsoWeekUTC,
  startOfMonthUTC,
  windowStart,
  PLAN_CAPS,
} from '../src/lib/limits';

test('free by default; cancelled/inactive own sub stays free', () => {
  assert.equal(resolveAthletePlan({}), 'free');
  assert.equal(resolveAthletePlan({ ownPlan: 'pro', ownStatus: 'canceled' }), 'free');
  assert.equal(resolveAthletePlan({ ownPlan: 'pro', ownStatus: null }), 'free');
});

test('pro when the athlete has their own active subscription', () => {
  for (const status of ['active', 'trialing', 'past_due']) {
    assert.equal(resolveAthletePlan({ ownPlan: 'pro', ownStatus: status }), 'pro');
  }
});

test('a paying coach grants the coach tier to clients, overriding own plan', () => {
  assert.equal(
    resolveAthletePlan({
      ownPlan: 'pro',
      ownStatus: 'active',
      coachPlan: 'coach',
      coachStatus: 'active',
    }),
    'coach',
  );
  assert.equal(resolveAthletePlan({ coachPlan: 'coach', coachStatus: 'active' }), 'coach');
});

test('an inactive coach grants nothing', () => {
  assert.equal(resolveAthletePlan({ coachPlan: 'coach', coachStatus: 'canceled' }), 'free');
  assert.equal(
    resolveAthletePlan({ ownPlan: 'pro', ownStatus: 'active', coachPlan: 'coach', coachStatus: 'past_due' }),
    'coach', // past_due is still within the grace window
  );
});

test('isActiveStatus treats the dunning grace window as entitled', () => {
  assert.ok(isActiveStatus('active'));
  assert.ok(isActiveStatus('trialing'));
  assert.ok(isActiveStatus('past_due'));
  assert.ok(!isActiveStatus('canceled'));
  assert.ok(!isActiveStatus('incomplete_expired'));
  assert.ok(!isActiveStatus(null));
  assert.ok(!isActiveStatus(undefined));
});

test('plan caps: free metered, pro generous, coach unlimited AI', () => {
  assert.equal(capsFor('free').formChecks.limit, 3);
  assert.equal(capsFor('free').formChecks.window, 'week');
  assert.equal(capsFor('pro').formChecks.limit, 100);
  assert.equal(capsFor('pro').formChecks.window, 'month');
  assert.equal(capsFor('coach').formChecks.limit, 200);
  assert.equal(capsFor('coach').ai.limit, null); // unlimited
  assert.equal(PLAN_CAPS.free.ai.window, 'week');
});

test('startOfMonthUTC snaps to the 1st at UTC midnight', () => {
  assert.equal(startOfMonthUTC(Date.UTC(2026, 5, 13, 17, 30, 59)), Date.UTC(2026, 5, 1));
  assert.equal(startOfMonthUTC(Date.UTC(2026, 0, 1, 0, 0, 0)), Date.UTC(2026, 0, 1));
});

test('startOfIsoWeekUTC always lands on the Monday at or before the instant', () => {
  const samples = [
    Date.UTC(2026, 5, 13, 12, 0),
    Date.UTC(2026, 5, 14, 1, 0),
    Date.UTC(2026, 5, 8, 9, 0),
    Date.UTC(2026, 0, 1, 23, 59),
    Date.now(),
  ];
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const t of samples) {
    const m = startOfIsoWeekUTC(t);
    const d = new Date(m);
    assert.equal(d.getUTCDay(), 1, 'Monday');
    assert.equal(d.getUTCHours(), 0);
    assert.equal(d.getUTCMinutes(), 0);
    assert.equal(d.getUTCSeconds(), 0);
    assert.ok(m <= t, 'not after the instant');
    assert.ok(t - m < weekMs, 'within the past week');
  }
});

test('windowStart dispatches to the right boundary', () => {
  const t = Date.UTC(2026, 5, 13, 12, 0);
  assert.equal(windowStart('week', t), startOfIsoWeekUTC(t));
  assert.equal(windowStart('month', t), startOfMonthUTC(t));
});
