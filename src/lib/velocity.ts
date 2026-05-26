// Effort from rep-time slowdown — honest by default, sharper with the
// lifter's data.
//
// We don't use absolute m/s (needs scale calibration the user rejected).
// Instead: how much the concentric slows from the fastest rep to the last
// (velocity loss %), mapped to reps-in-reserve via the bench research, then
// calibrated to the individual:
//   • <4 calibrated sets → research curve, wide band, "rough"
//   • 4–7 calibrated sets → lifter's own fit, "estimated"
//   • ≥8 calibrated sets  → lifter's own fit, tight band, "measured"
// A calibrated set = an analysed set where the lifter confirmed actual RPE.

import type { LiftType, RpeConfidence, RpeEstimate } from './types';

export interface CalibrationPoint {
  lossPct: number; // velocity loss % for the set (fastest → last rep)
  rpe: number; // actual RPE the lifter confirmed
}

// Velocity-loss (%) -> reps-in-reserve. Mirrors the per-lift curves in
// cv-service/analysis.py. Squat / DL slow LESS than bench at the same RIR
// (heavier load, longer ROM grind), so 30% loss on a squat is ~halfway to
// failure rather than "3 RIR" like bench.
const LOSS_RIR_BENCH: [number, number][] = [
  [0, 5], [15, 4], [30, 3], [40, 2.3], [50, 1.6], [60, 1.1], [70, 0.5], [80, 0],
];
const LOSS_RIR_SQUAT: [number, number][] = [
  [0, 5], [15, 4.5], [30, 4], [45, 3], [55, 2.3], [65, 1.5], [75, 1], [85, 0.3], [95, 0],
];
const LOSS_RIR_DEADLIFT = LOSS_RIR_SQUAT;

function curveFor(lift: LiftType): [number, number][] {
  if (lift === 'bench') return LOSS_RIR_BENCH;
  if (lift === 'deadlift') return LOSS_RIR_DEADLIFT;
  return LOSS_RIR_SQUAT; // squat (and 'other' falls back to squat)
}

function clampRpe(v: number): number {
  return Math.max(4, Math.min(10, Math.round(v * 2) / 2));
}

export function rirFromLoss(lossPct: number, lift: LiftType = 'bench'): number {
  const a = curveFor(lift);
  if (lossPct <= a[0][0]) return a[0][1];
  if (lossPct >= a[a.length - 1][0]) return a[a.length - 1][1];
  for (let i = 0; i < a.length - 1; i++) {
    const [l0, r0] = a[i];
    const [l1, r1] = a[i + 1];
    if (lossPct >= l0 && lossPct <= l1) {
      const f = (lossPct - l0) / (l1 - l0);
      return Math.round((r0 + f * (r1 - r0)) * 10) / 10;
    }
  }
  return 2;
}

export function genericRpeFromLoss(lossPct: number, lift: LiftType = 'bench'): number {
  return clampRpe(10 - rirFromLoss(lossPct, lift));
}

// OLS: rpe ≈ a + b·lossPct (b should be > 0 — more slowdown ⇒ higher RPE).
function linFit(pts: CalibrationPoint[]): { a: number; b: number; resStd: number } | null {
  const n = pts.length;
  if (n < 2) return null;
  const mx = pts.reduce((s, p) => s + p.lossPct, 0) / n;
  const my = pts.reduce((s, p) => s + p.rpe, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    sxx += (p.lossPct - mx) ** 2;
    sxy += (p.lossPct - mx) * (p.rpe - my);
  }
  if (sxx < 1e-9) return null;
  const b = sxy / sxx;
  const a = my - b * mx;
  let ss = 0;
  for (const p of pts) ss += (p.rpe - (a + b * p.lossPct)) ** 2;
  return { a, b, resStd: Math.sqrt(ss / Math.max(1, n - 2)) };
}

/**
 * Estimate RPE for a set's velocity loss %, using the lifter's calibration
 * history when there's enough of it.
 */
export function estimateRpe(
  lossPct: number | null,
  history: CalibrationPoint[],
  lift: LiftType = 'bench',
): RpeEstimate {
  if (lossPct == null) {
    return {
      value: clampRpe(8),
      confidence: 'rough',
      band: [6, 10],
      source:
        'Single rep / no rep-to-rep slowdown to read — record 2+ reps so effort can be measured.',
    };
  }

  const fit = history.length >= 4 ? linFit(history) : null;
  if (fit && fit.b > 0.02) {
    const raw = fit.a + fit.b * lossPct;
    const value = clampRpe(raw);
    const half = Math.max(0.5, Math.min(2, fit.resStd * 1.5));
    const confidence: RpeConfidence = history.length >= 8 ? 'measured' : 'estimated';
    return {
      value,
      confidence,
      band: [clampRpe(raw - half), clampRpe(raw + half)],
      source:
        confidence === 'measured'
          ? `From your ${lift} slowdown→RPE profile (${history.length} calibrated sets).`
          : `Early read from your ${history.length} calibrated ${lift} sets — confirm RPE to sharpen it.`,
    };
  }

  const value = genericRpeFromLoss(lossPct, lift);
  return {
    value,
    confidence: 'rough',
    band: [clampRpe(value - 1.5), clampRpe(value + 1.5)],
    source:
      `${lift[0].toUpperCase() + lift.slice(1)} velocity-loss research (~${lossPct.toFixed(0)}% slowdown). ` +
      `Not calibrated to you yet — confirm actual RPE on a few sets to build your own profile.`,
  };
}
