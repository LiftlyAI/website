import type { AthleteProfile, MacroTargets, Unit } from './types';

// ---------- Unit helpers ----------

export const LB_PER_KG = 2.2046226218;

export function toKg(weight: number, unit: Unit): number {
  return unit === 'kg' ? weight : weight / LB_PER_KG;
}
export function toLbs(weight: number, unit: Unit): number {
  return unit === 'lbs' ? weight : weight * LB_PER_KG;
}

// Parse height like 5'11" or 180cm into cm
export function parseHeightCm(h: string): number {
  const trimmed = h.trim().toLowerCase();
  if (trimmed.endsWith('cm')) return parseFloat(trimmed);
  // feet/inches: 5'11" or 5'11 or 5 11
  const ft = trimmed.match(/(\d+)\s*['′]\s*(\d+(?:\.\d+)?)/);
  if (ft) {
    const feet = parseInt(ft[1], 10);
    const inches = parseFloat(ft[2]);
    return Math.round((feet * 12 + inches) * 2.54);
  }
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num > 100 && num < 230) return num; // assume cm
  return 175;
}

// ---------- BMR / TDEE ----------

// Mifflin-St Jeor
export function mifflin(profile: AthleteProfile): number {
  const kg = toKg(profile.bodyweight, profile.unit);
  const cm = parseHeightCm(profile.height);
  const base = 10 * kg + 6.25 * cm - 5 * profile.age;
  return Math.round(profile.sex === 'male' ? base + 5 : base - 161);
}

// Katch-McArdle (uses lean mass)
export function katch(profile: AthleteProfile, bodyFatPct: number): number {
  const kg = toKg(profile.bodyweight, profile.unit);
  const lean = kg * (1 - bodyFatPct / 100);
  return Math.round(370 + 21.6 * lean);
}

export function bmr(profile: AthleteProfile): number {
  if (profile.bodyFatPct && profile.bodyFatPct > 5 && profile.bodyFatPct < 50) {
    return katch(profile, profile.bodyFatPct);
  }
  return mifflin(profile);
}

export function activityMultiplier(daysPerWeek: number): number {
  if (daysPerWeek <= 3) return 1.55;
  if (daysPerWeek <= 5) return 1.65;
  return 1.725;
}

export function tdee(profile: AthleteProfile): number {
  return Math.round(bmr(profile) * activityMultiplier(profile.trainingDaysPerWeek));
}

export function phaseAdjustment(profile: AthleteProfile): number {
  if (profile.phaseGoal === 'gaining') return 300; // +300 kcal lean gain
  if (profile.phaseGoal === 'cutting') return -400; // -400 kcal moderate cut
  return 0;
}

// ---------- Macros ----------

export function macroTargets(profile: AthleteProfile): MacroTargets {
  const kg = toKg(profile.bodyweight, profile.unit);
  const _bmr = bmr(profile);
  const _tdee = tdee(profile);
  const adj = phaseAdjustment(profile);
  const calories = _tdee + adj;

  // Protein: 2.0g/kg cut, 1.8g/kg gain, 1.6g/kg maintain (advanced bumps to 2.2)
  let proteinPerKg = 1.8;
  if (profile.phaseGoal === 'cutting') proteinPerKg = 2.2;
  else if (profile.phaseGoal === 'maintaining') proteinPerKg = 1.6;
  if (profile.experience === 'advanced' && profile.phaseGoal !== 'maintaining') {
    proteinPerKg = Math.max(proteinPerKg, 2.0);
  }

  const protein_g = Math.round(kg * proteinPerKg);
  // Fat: 0.8g/kg baseline, min 20% of cals
  const fatPerKg = 0.9;
  let fat_g = Math.round(kg * fatPerKg);
  const minFatCals = calories * 0.2;
  if (fat_g * 9 < minFatCals) fat_g = Math.round(minFatCals / 9);

  const remainingCals = calories - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(remainingCals / 4));

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    proteinPerKg,
    fatPerKg,
    bmr: _bmr,
    tdee: _tdee,
    phaseAdjustment: adj,
  };
}

// ---------- e1RM ----------

export function epley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function brzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps >= 37) return weight; // formula breaks down
  return Math.round((weight * 36) / (37 - reps));
}

export function estimatedOneRM(weight: number, reps: number): number {
  // Average the two for low-rep accuracy + high-rep stability
  if (reps === 1) return weight;
  if (reps <= 5) return brzycki(weight, reps);
  return Math.round((epley(weight, reps) + brzycki(weight, reps)) / 2);
}

// ---------- RPE → percent of 1RM ----------
// Tuchscherer-style chart, % of 1RM by reps × RPE.
const rpeChart: Record<number, Record<number, number>> = {
  1: { 6: 0.86, 7: 0.91, 7.5: 0.92, 8: 0.94, 8.5: 0.95, 9: 0.96, 9.5: 0.98, 10: 1.0 },
  2: { 6: 0.84, 7: 0.88, 7.5: 0.89, 8: 0.91, 8.5: 0.92, 9: 0.94, 9.5: 0.95, 10: 0.96 },
  3: { 6: 0.81, 7: 0.85, 7.5: 0.86, 8: 0.88, 8.5: 0.9, 9: 0.91, 9.5: 0.92, 10: 0.94 },
  4: { 6: 0.79, 7: 0.83, 7.5: 0.84, 8: 0.86, 8.5: 0.88, 9: 0.89, 9.5: 0.9, 10: 0.92 },
  5: { 6: 0.77, 7: 0.81, 7.5: 0.82, 8: 0.84, 8.5: 0.85, 9: 0.86, 9.5: 0.88, 10: 0.89 },
  6: { 6: 0.75, 7: 0.79, 7.5: 0.8, 8: 0.81, 8.5: 0.83, 9: 0.84, 9.5: 0.85, 10: 0.86 },
  7: { 6: 0.72, 7: 0.76, 7.5: 0.78, 8: 0.79, 8.5: 0.81, 9: 0.82, 9.5: 0.83, 10: 0.84 },
  8: { 6: 0.7, 7: 0.74, 7.5: 0.76, 8: 0.77, 8.5: 0.79, 9: 0.8, 9.5: 0.81, 10: 0.82 },
  9: { 6: 0.68, 7: 0.72, 7.5: 0.73, 8: 0.75, 8.5: 0.77, 9: 0.78, 9.5: 0.79, 10: 0.8 },
  10: { 6: 0.66, 7: 0.7, 7.5: 0.71, 8: 0.73, 8.5: 0.74, 9: 0.76, 9.5: 0.77, 10: 0.78 },
};

export function rpePercent(reps: number, rpe: number): number {
  const r = Math.max(1, Math.min(10, reps));
  const row = rpeChart[r] ?? rpeChart[10];
  // Find nearest RPE key
  const keys = Object.keys(row).map(Number).sort((a, b) => a - b);
  let nearest = keys[0];
  for (const k of keys) {
    if (Math.abs(k - rpe) < Math.abs(nearest - rpe)) nearest = k;
  }
  return row[nearest];
}

export function suggestWeight(oneRM: number, reps: number, targetRPE: number, unit: Unit): number {
  const pct = rpePercent(reps, targetRPE);
  const raw = oneRM * pct;
  const step = unit === 'kg' ? 2.5 : 5;
  return Math.round(raw / step) * step;
}

// ---------- Wilks-ish total estimate from bodyweight + sex ----------
// Used when athlete doesn't know maxes — give conservative novice maxes.
export function noviceMaxEstimate(profile: AthleteProfile): {
  squat: number;
  bench: number;
  deadlift: number;
} {
  const kg = toKg(profile.bodyweight, profile.unit);
  // Very conservative untrained baselines as multiples of bodyweight.
  const m = profile.sex === 'male' ? 1 : 0.65;
  const squatKg = Math.round(kg * 1.0 * m);
  const benchKg = Math.round(kg * 0.75 * m);
  const dlKg = Math.round(kg * 1.25 * m);
  if (profile.unit === 'kg') {
    return { squat: squatKg, bench: benchKg, deadlift: dlKg };
  }
  return {
    squat: Math.round(toLbs(squatKg, 'kg') / 5) * 5,
    bench: Math.round(toLbs(benchKg, 'kg') / 5) * 5,
    deadlift: Math.round(toLbs(dlKg, 'kg') / 5) * 5,
  };
}

// ---------- RPE → color ----------
export function rpeColor(rpe: number): string {
  if (rpe <= 7) return 'rpe-easy';
  if (rpe < 8.5) return 'rpe-mod';
  if (rpe < 9.5) return 'rpe-hard';
  return 'rpe-max';
}
