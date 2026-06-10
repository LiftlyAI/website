import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReview, type WeeklyReviewInput } from '../src/lib/weekly-review';
import type { DecisionFinding } from '../src/lib/types';

const base: WeeklyReviewInput = {
  weekStart: '2026-06-07',
  blockName: 'Strength',
  unit: 'lbs',
  plannedSessions: 4,
  actualSessions: 4,
  plannedTonnage: 40000,
  actualTonnage: 41000,
  lifts: [
    { lift: 'squat', plannedTopWeight: 315, actualTopWeight: 320 },
    { lift: 'bench', plannedTopWeight: 225, actualTopWeight: 215 },
  ],
  findings: [],
};

const caution: DecisionFinding = {
  rule: 'plateau',
  lift: 'bench',
  severity: 'caution',
  title: 'Bench e1RM has flatlined this block',
  detail: 'flat',
  action: 'Change one variable next block.',
};
const suggest: DecisionFinding = {
  rule: 'soreness-streak',
  lift: null,
  severity: 'suggest',
  title: 'Two sore days back-to-back',
  detail: 'sore',
  action: 'Take the top set to RPE −1.',
};

test('sessions row is on-track when actual ≥ planned', () => {
  const r = buildWeeklyReview(base);
  assert.equal(r.sessions.onTrack, true);
  assert.equal(r.sessions.planned, '4');
  assert.equal(r.sessions.actual, '4');
});

test('rows include tonnage and per-lift top sets with on-track flags', () => {
  const r = buildWeeklyReview(base);
  const labels = r.rows.map((x) => x.label);
  assert.ok(labels.includes('Tonnage'));
  assert.ok(labels.includes('Squat top set'));
  const bench = r.rows.find((x) => x.label === 'Bench top set')!;
  assert.equal(bench.onTrack, false); // 215 < 225 planned
});

test('Sunday tweak: a caution finding becomes the headline change', () => {
  const r = buildWeeklyReview({ ...base, findings: [suggest, caution] });
  assert.match(r.sundayTweak, /flatlined/);
});

test('Sunday tweak: missed sessions beat a mere suggestion', () => {
  const r = buildWeeklyReview({
    ...base,
    plannedSessions: 4,
    actualSessions: 1,
    findings: [suggest],
  });
  assert.match(r.sundayTweak.toLowerCase(), /attendance|session/);
});

test('Sunday tweak: nothing flagging and work done → hold the line', () => {
  const r = buildWeeklyReview(base);
  assert.match(r.sundayTweak.toLowerCase(), /hold the line/);
});

test('a lift logged but not planned still shows up', () => {
  const r = buildWeeklyReview({
    ...base,
    lifts: [{ lift: 'deadlift', plannedTopWeight: null, actualTopWeight: 405 }],
  });
  const dl = r.rows.find((x) => x.label === 'Deadlift top set')!;
  assert.equal(dl.planned, '—');
  assert.equal(dl.actual, '405 lbs');
  assert.equal(dl.onTrack, true); // no plan to miss
});
