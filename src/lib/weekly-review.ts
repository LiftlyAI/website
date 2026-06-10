// Weekly review — the "Sunday tweak". Pure: the caller pulls the week's planned
// vs actual numbers and the decision findings, this shapes them into the review
// card model and distills the ONE change worth making next week. No DB / I/O.

import type {
  DecisionFinding,
  LiftType,
  PlannedActual,
  Unit,
  WeeklyReview,
} from './types';

export interface WeeklyLiftLine {
  lift: LiftType;
  plannedTopWeight: number | null; // program's top working set this week
  actualTopWeight: number | null; // heaviest working set actually logged
}

export interface WeeklyReviewInput {
  weekStart: string; // ISO Sunday
  blockName: string | null;
  unit: Unit;
  plannedSessions: number;
  actualSessions: number;
  plannedTonnage: number | null;
  actualTonnage: number;
  lifts: WeeklyLiftLine[];
  findings: DecisionFinding[];
}

const wt = (n: number | null, unit: Unit): string => (n == null ? '—' : `${Math.round(n)} ${unit}`);
const cap = (l: LiftType): string => `${l[0].toUpperCase()}${l.slice(1)}`;

export function buildWeeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const { unit } = input;

  const sessions: PlannedActual = {
    label: 'Sessions',
    planned: String(input.plannedSessions),
    actual: String(input.actualSessions),
    onTrack: input.actualSessions >= input.plannedSessions,
  };

  const rows: PlannedActual[] = [];

  if (input.plannedTonnage != null || input.actualTonnage > 0) {
    rows.push({
      label: 'Tonnage',
      planned: input.plannedTonnage != null ? `${Math.round(input.plannedTonnage).toLocaleString()} ${unit}` : '—',
      actual: `${Math.round(input.actualTonnage).toLocaleString()} ${unit}`,
      onTrack:
        input.plannedTonnage == null || input.actualTonnage >= input.plannedTonnage * 0.9,
    });
  }

  for (const l of input.lifts) {
    if (l.plannedTopWeight == null && l.actualTopWeight == null) continue;
    rows.push({
      label: `${cap(l.lift)} top set`,
      planned: wt(l.plannedTopWeight, unit),
      actual: wt(l.actualTopWeight, unit),
      onTrack:
        l.plannedTopWeight == null ||
        (l.actualTopWeight != null && l.actualTopWeight >= l.plannedTopWeight),
    });
  }

  return {
    weekStart: input.weekStart,
    blockName: input.blockName,
    sessions,
    rows,
    findings: input.findings,
    sundayTweak: distillTweak(input),
  };
}

// The single recommended change for next week. A caution finding outranks a
// suggestion outranks adherence; if nothing's flagging and the work got done,
// the honest answer is "don't change anything".
function distillTweak(input: WeeklyReviewInput): string {
  const caution = input.findings.find((f) => f.severity === 'caution');
  if (caution) return `${caution.title}: ${caution.action}`;

  const missed = input.plannedSessions - input.actualSessions;
  if (missed >= 2) {
    return `You logged ${input.actualSessions} of ${input.plannedSessions} planned sessions. The fix next week is attendance, not the program — protect the sessions before changing the training.`;
  }

  const suggest = input.findings.find((f) => f.severity === 'suggest');
  if (suggest) return `${suggest.title}: ${suggest.action}`;

  if (missed === 1) {
    return 'One session short but the lifts held — get the full week in and run the same plan back.';
  }

  return 'Nothing’s flagging and the work got done. Hold the line — run the same plan back next week and let it keep paying.';
}
