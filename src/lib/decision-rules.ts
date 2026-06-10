// Decision rules — the "Adapt" brain, kept as a bag of small PURE functions.
// Each rule reads a plain DecisionContext (already pulled from the DB by the
// caller) and returns a DecisionFinding or null. evaluateDecisions composes them.
//
// HARD CONSTRAINT: nothing here mutates the autoregulation engine
// (adjustExercise) or rewrites the program. Findings ADVISE the lifter in the
// weekly review; the human decides. This keeps the closed loop honest — we never
// silently deload someone off a self-reported number.

import type { DecisionFinding, LiftType, Unit } from './types';

// ---------- The plain inputs (no DB handles, so it stays unit-testable) ----------

export interface ReadinessDay {
  date: string; // ISO, newest-first in the array
  soreness: number; // 10 = worst
  pain: number | null;
}

export interface FormCheckSummary {
  date: string; // ISO
  lift: LiftType;
  formNotes: string[]; // short fault phrases from the CV / AI analysis
  velocityLossPct: number | null; // intra-set MCV loss, if measured
}

export interface SessionE1rm {
  date: string; // ISO, chronological (oldest-first) per lift
  e1rm: number;
}

export interface DecisionContext {
  today: string;
  unit: Unit;
  readiness: ReadinessDay[]; // newest-first
  formChecks: FormCheckSummary[]; // newest-first
  sessionsByLift: Partial<Record<LiftType, SessionE1rm[]>>; // oldest-first per lift
  blockName: string | null;
}

const COMPOUNDS: LiftType[] = ['squat', 'bench', 'deadlift'];

// Normalise a fault phrase to a coarse token so "knees caved" and "knee cave"
// count as the same recurring flaw.
function faultToken(note: string): string {
  const n = note.toLowerCase();
  if (n.includes('knee')) return 'knee-tracking';
  if (n.includes('depth') || n.includes('shallow') || n.includes('high')) return 'depth';
  if (n.includes('hip') && (n.includes('shoot') || n.includes('rise') || n.includes('lead')))
    return 'hips-shoot';
  if (n.includes('back') && (n.includes('round') || n.includes('flex'))) return 'back-rounding';
  if (n.includes('elbow') || n.includes('flare')) return 'elbow-path';
  if (n.includes('bar') && (n.includes('drift') || n.includes('forward') || n.includes('path')))
    return 'bar-path';
  if (n.includes('butt') || n.includes('hips up') || n.includes('rise off')) return 'bench-hips';
  if (n.includes('lockout') || n.includes('extend')) return 'lockout';
  return '';
}

const DRILL: Record<string, string> = {
  'knee-tracking': 'tempo squats (3s down) + banded knees-out cues for a week',
  depth: 'pause squats to a target at RPE 7 until depth is automatic',
  'hips-shoot': 'paused/tempo squats and lighter deadlift singles holding the brace off the floor',
  'back-rounding': 'deadlift to a slight deficit at RPE 6–7 drilling a flat-back set-up',
  'elbow-path': 'paused bench with tucked elbows + spoto presses',
  'bar-path': 'paused reps filmed from the side until the bar tracks straight',
  'bench-hips': 'feet-up bench for a few sessions to kill the hip drive, then re-cue the arch',
  lockout: 'block pulls / pin presses in the top third of the ROM',
};

// ---------- Rule 1: soreness streak → RPE −1 ----------
// Two days running of high soreness is a recovery signal, not a one-off. Suggest
// (don't force) shaving a point off today's top-set RPE.
export function ruleSorenessStreak(ctx: DecisionContext): DecisionFinding | null {
  const recent = ctx.readiness.slice(0, 2);
  if (recent.length < 2) return null;
  if (!recent.every((d) => d.soreness >= 7)) return null;
  return {
    rule: 'soreness-streak',
    lift: null,
    severity: 'suggest',
    title: 'Two sore days back-to-back',
    detail: `Soreness has sat at ${recent[0].soreness} and ${recent[1].soreness}/10 two days running — that’s accumulated fatigue, not a single rough night.`,
    action: 'Take today’s top set to RPE −1 of programmed and keep back-offs the same. Reassess tomorrow.',
  };
}

// ---------- Rule 2: recurring video flaw → a targeted drill ----------
// A fault that shows up in ≥2 of a lift's recent clips is a pattern worth a drill.
export function ruleVideoFlaw(ctx: DecisionContext): DecisionFinding | null {
  for (const lift of COMPOUNDS) {
    const checks = ctx.formChecks.filter((c) => c.lift === lift).slice(0, 4);
    if (checks.length < 2) continue;
    const counts = new Map<string, number>();
    for (const c of checks) {
      const seen = new Set<string>();
      for (const note of c.formNotes) {
        const t = faultToken(note);
        if (!t || seen.has(t)) continue;
        seen.add(t);
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    let token = '';
    let n = 0;
    for (const [t, c] of counts) if (c > n) ((token = t), (n = c));
    if (n >= 2 && token) {
      return {
        rule: 'video-flaw',
        lift,
        severity: 'suggest',
        title: `Recurring ${lift} fault: ${token.replace('-', ' ')}`,
        detail: `The same flaw (${token.replace('-', ' ')}) showed up in ${n} of your last ${checks.length} ${lift} clips — it’s a pattern, not a fluke rep.`,
        action: `Swap in ${DRILL[token] ?? 'a targeted technique drill'} before adding load.`,
      };
    }
  }
  return null;
}

// ---------- Rule 3: plateau across the block → change a stimulus ----------
// e1RM flat or down across ≥3 sessions in the block = the current stimulus has
// stopped paying. Suggest changing ONE variable next block (not random thrash).
export function rulePlateau(ctx: DecisionContext): DecisionFinding | null {
  for (const lift of COMPOUNDS) {
    const series = (ctx.sessionsByLift[lift] ?? []).filter((s) => s.e1rm > 0);
    if (series.length < 3) continue;
    const first = series[0].e1rm;
    const best = Math.max(...series.map((s) => s.e1rm));
    const last = series[series.length - 1].e1rm;
    // No meaningful PR across the block AND not currently at a new high.
    const gain = (best - first) / first;
    const stalled = gain < 0.01 && last <= best;
    if (!stalled) continue;
    return {
      rule: 'plateau',
      lift,
      severity: 'caution',
      title: `${lift[0].toUpperCase()}${lift.slice(1)} e1RM has flatlined this block`,
      detail: `Across ${series.length} sessions your ${lift} e1RM hasn’t cleared ${first} ${ctx.unit} — the current stimulus has stopped driving progress.`,
      action: 'Change one variable next block: rotate the main variation, shift the rep range, or add a weekly exposure. Keep everything else constant so you can read the change.',
    };
  }
  return null;
}

// ---------- Rule 4: big intra-set velocity drop → cap the set ----------
// A measured MCV loss this high means the last reps were near-grinders. Cap reps/
// sets next time rather than burying the lifter under junk fatigue.
export function ruleVelocityDrop(ctx: DecisionContext): DecisionFinding | null {
  const withVel = ctx.formChecks.filter((c) => c.velocityLossPct != null);
  if (withVel.length === 0) return null;
  const latest = withVel[0];
  if ((latest.velocityLossPct ?? 0) < 30) return null;
  return {
    rule: 'velocity-drop',
    lift: latest.lift,
    severity: 'caution',
    title: `Heavy bar slowdown on ${latest.lift}`,
    detail: `Your last ${latest.lift} top set lost ${Math.round(latest.velocityLossPct!)}% bar speed by the final rep — those reps were near-maximal effort.`,
    action: 'Cap that set a rep earlier next time (leave 1–2 in the tank) so the back-offs stay crisp instead of grinding.',
  };
}

const RULES: ((ctx: DecisionContext) => DecisionFinding | null)[] = [
  ruleSorenessStreak,
  ruleVideoFlaw,
  rulePlateau,
  ruleVelocityDrop,
];

const SEVERITY_ORDER: Record<DecisionFinding['severity'], number> = {
  caution: 0,
  suggest: 1,
  info: 2,
};

export function evaluateDecisions(ctx: DecisionContext): DecisionFinding[] {
  const out: DecisionFinding[] = [];
  for (const rule of RULES) {
    const finding = rule(ctx);
    if (finding) out.push(finding);
  }
  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
