// Readiness → a SOFT, optional override. Pure (no DB / I/O) so it unit-tests
// cleanly. This deliberately does NOT produce a deterministic deload or a
// fake-precise "readiness number that means train at exactly X". It produces a
// flag, a plain-language headline, and at most a SUGGESTED RPE ceiling the
// lifter is free to ignore. The autoregulation engine (adjustExercise) never
// reads this — the human does, and decides.

import type { ReadinessAssessment, ReadinessFlag, ReadinessLog } from './types';

// The four dials a check-in collects (sleep/energy: 10 best; soreness/stress: 10 worst).
export interface ReadinessInput {
  sleep: number;
  energy: number;
  soreness: number;
  stress: number;
  pain?: number | null; // acute/joint pain, 10 = worst; optional
}

const clamp10 = (n: number): number => Math.max(1, Math.min(10, Math.round(n)));

// 0-100 composite, "higher = more ready". Equal-weighted across the four dials,
// soreness/stress inverted so all four point the same way. Display only — we do
// not pretend this maps to a precise training prescription.
export function readinessScore(input: ReadinessInput): number {
  const sleep = clamp10(input.sleep);
  const energy = clamp10(input.energy);
  const soreness = clamp10(input.soreness);
  const stress = clamp10(input.stress);
  const good = (sleep + energy + (11 - soreness) + (11 - stress)) / 4; // 1-10
  return Math.round(((good - 1) / 9) * 100);
}

export function readinessModifier(input: ReadinessInput): ReadinessAssessment {
  const score = readinessScore(input);
  const sleep = clamp10(input.sleep);
  const energy = clamp10(input.energy);
  const soreness = clamp10(input.soreness);
  const stress = clamp10(input.stress);
  const pain = input.pain == null ? null : clamp10(input.pain);

  // Base flag from the composite.
  let flag: ReadinessFlag = score >= 67 ? 'green' : score >= 40 ? 'amber' : 'red';

  // Acute pain is its own axis — it escalates the flag and routes to a PT,
  // never a "push through it". Distinct from training soreness above.
  const seePtAdvice = pain != null && pain >= 4;
  if (pain != null) {
    if (pain >= 8 && flag !== 'red') flag = 'red';
    else if (pain >= 6 && flag === 'green') flag = 'amber';
  }

  // Soft, suggested top-set ceiling. Null on green = train as programmed.
  const rpeCap = flag === 'red' ? 7 : flag === 'amber' ? 8 : null;

  // The biggest single drag, named honestly — no euphemism.
  const drags: { label: string; bad: number }[] = [
    { label: 'sleep is short', bad: 11 - sleep },
    { label: 'energy is low', bad: 11 - energy },
    { label: 'you’re sore', bad: soreness },
    { label: 'stress is high', bad: stress },
  ].sort((a, b) => b.bad - a.bad);
  const worst = drags[0];

  const suggestions: string[] = [];
  let headline: string;
  if (flag === 'green') {
    headline = 'Green light — nothing’s flagging. Train as programmed.';
  } else if (flag === 'amber') {
    headline = `A bit beat up today (${worst.label}). Suggested ceiling RPE ${rpeCap} on the top set — your call, not a rule.`;
    suggestions.push('Hit your openers/back-offs as planned; just don’t chase a top-end single.');
    if (soreness >= 7) suggestions.push('Add a few minutes of warm-up on the sore area before working sets.');
  } else {
    headline = `Rough day (${worst.label}). If you train, cap the top set around RPE ${rpeCap} and cut it short if it’s grinding.`;
    suggestions.push('A short technique session at RPE 6–7 still counts — or take the rest day. No deload forced on you.');
  }

  if (seePtAdvice) {
    const painLine =
      pain != null && pain >= 7
        ? 'You flagged sharp/joint pain that’s high — see a sports-med doctor or PT before loading it. Don’t train through it.'
        : 'You flagged some sharp/joint pain — work around it and get it looked at by a PT if it persists. Soreness is fine to train; pain isn’t.';
    suggestions.unshift(painLine);
  }

  return { flag, score, rpeCap, headline, suggestions, seePtAdvice };
}

// Convenience for callers that have a persisted row.
export function assessReadinessLog(row: ReadinessLog): ReadinessAssessment {
  return readinessModifier({
    sleep: row.sleep,
    energy: row.energy,
    soreness: row.soreness,
    stress: row.stress,
    pain: row.pain,
  });
}
