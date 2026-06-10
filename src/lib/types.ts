// Shared types — single source of truth for app shape.

export type Unit = 'lbs' | 'kg';
export type Sex = 'male' | 'female';
export type Experience = 'novice' | 'intermediate' | 'advanced';
export type SquatStyle = 'high_bar' | 'low_bar' | 'unsure';
export type DeadliftStance = 'conventional' | 'sumo' | 'unsure';
export type BenchGrip = 'close' | 'medium' | 'wide' | 'unsure';
export type Equipment = 'raw' | 'sleeves' | 'wraps' | 'belt_only' | 'fully_equipped';
export type Goal =
  | 'total_max'
  | 'meet_prep'
  | 'recomp'
  | 'general_strength';
export type DietaryRestriction =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'lactose_free'
  | 'gluten_free';
export type PhaseGoal = 'gaining' | 'maintaining' | 'cutting';
export type LiftType = 'squat' | 'bench' | 'deadlift' | 'other';

export interface AthleteProfile {
  name: string;
  email: string;
  age: number;
  sex: Sex;
  bodyweight: number;
  unit: Unit;
  height: string; // e.g. 5'11" or 180cm
  bodyFatPct?: number;
  targetWeightClass?: number;

  experience: Experience;
  currentMaxes: {
    squat: number | null;
    bench: number | null;
    deadlift: number | null;
  };
  squatStyle: SquatStyle;
  deadliftStance: DeadliftStance;
  benchGrip: BenchGrip;
  equipment: Equipment;

  trainingDaysPerWeek: 3 | 4 | 5 | 6;
  goal: Goal;
  meetDate: string | null; // ISO yyyy-mm-dd
  injuries: string;

  dietaryRestrictions: DietaryRestriction[];
  phaseGoal: PhaseGoal;
  mealsPerDay: number;

  /** Hard safety constraints: free-text foods to NEVER include (allergies /
   *  intolerances). Validated deterministically after every generation. */
  allergies?: string;
  /** Durable soft preferences: cuisines, liked/disliked foods, time or budget.
   *  Honoured by the meal generator when compatible with the macro targets. */
  foodPreferences?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  targetRPE: number;
  percentageOfMax?: number;
  estimatedWeight?: number;
  unit?: Unit;
  notes?: string;
  isCompetitionLift?: boolean;
  videoFormCheckRecommended?: boolean;
}

export interface ProgramDay {
  dayNumber: number;
  dayName: string;
  exercises: Exercise[];
}

export interface ProgramWeek {
  weekNumber: number;
  blockName: string;
  theme: string;
  days: ProgramDay[];
}

export interface Program {
  name: string;
  athlete: string;
  currentBlock: string;
  totalWeeks: number;
  weeks: ProgramWeek[];
}

export interface SessionLogEntry {
  exercise: string;
  sets: { reps: number; weight: number; actualRPE: number }[];
}

export interface SessionLog {
  id: string;
  athleteId: string;
  date: string;
  weekNumber: number;
  dayNumber: number;
  exercises: SessionLogEntry[];
  bodyweight?: number;
  notes?: string;
  createdAt: number;
}

// ---------- Bar-path CV (from the Python sidecar) ----------

// Bar = the wrist line (pose-tracked). Coords are body-relative & scale-free:
// x/y are isotropic normalised image units, distances in torso-lengths.
export interface BarPathPoint {
  t: number; // seconds
  x: number; // horizontal, isotropic normalised
  y: number; // +ve = up
}

export interface RepMetric {
  index: number;
  descentS: number;
  pauseS: number;
  concentricS: number; // press duration — the effort signal
  slowdownVsFastestPct: number;
  romTorso: number;
  barDriftTorso: number; // signed horizontal travel over the concentric
  curveRatio: number; // 0 = pressed straight up
  // Bench-only (the J-curve and elbow/wrist stack):
  towardShoulderTorso?: number;
  touchOnTorso?: number;
  elbowAngleBottom?: number | null;
  elbowAngleLockout?: number | null;
  elbowFlareDeg?: number | null;
  wristAheadOfElbowTorso?: number;
  // Squat-only (depth + knee tracking at the bottom):
  depthHipMinusKneeTorso?: number;
  kneeVsAnkleTorso?: number;
  // Deadlift-only (bar over mid-foot AT LIFT-OFF + lockout extension):
  barOverMidfootTorso?: number;
  lockoutHipKneeAnkleDeg?: number | null;
  // Squat & deadlift: hip rise vs shoulder rise at the start of the
  // concentric. +ve = hips outpace shoulders (the "hips shoot up" fault).
  hipLeadAtStartTorso?: number;
  phases: {
    descent: [number, number];
    pause: [number, number];
    press: [number, number];
    lockout: [number, number];
  };
}

export interface CvAnalysis {
  ok: true;
  fps: number;
  lift: 'bench' | 'squat' | 'deadlift';
  barSource?: 'plate' | 'wrist';
  pose: {
    detectedFrames: number;
    totalFrames: number;
    coverage: number;
    quality: 'good' | 'fair' | 'low';
  };
  path: BarPathPoint[];
  reps: RepMetric[];
  summary: {
    repCount: number;
    firstRepConcentricS?: number;
    fastestRepConcentricS?: number;
    lastRepConcentricS?: number;
    velocityLossPct: number | null;
    wallRepIndex: number | null;
    rir: number | null;
    rpe: number | null;
    rpeConfidence: RpeConfidence;
    barPathNote: string;
    shoulderStabilityTorso?: number;
    hipStabilityTorso?: number;
    footMovementTorso?: number;
    formNotes: string[];
  };
  overlayPng: string; // base64 PNG (skeleton + bar path)
  warnings: string[];
}

export type RpeConfidence = 'measured' | 'estimated' | 'rough';

export interface RpeEstimate {
  value: number;
  confidence: RpeConfidence;
  band: [number, number]; // plausible RPE range
  source: string; // human-readable explanation
}

export interface FormCheckResult {
  id: string;
  athleteId: string;
  liftType: LiftType;
  videoPath: string | null;
  framesCount: number;
  userContext: string;
  aiAnalysis: string;
  estimatedRPE: number | null;
  rpeConfidence: RpeConfidence | null;
  loadKg: number | null;
  cv: CvAnalysis | null;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  athleteId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  proteinPerKg: number;
  fatPerKg: number;
  carbsPerKg: number;
  perMealProteinG: number;
  bmr: number;
  tdee: number;
  phaseAdjustment: number;
}

export interface Meal {
  name: string;
  timing: string;
  items: { food: string; quantity: string; calories?: number }[];
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

export interface MealPlan {
  dailyTotals: MacroTargets;
  meals: Meal[];
  preWorkout: string;
  postWorkout: string;
  notes: string[];
}

// ---------- Loop handoff (what the next stage should do after a log) ----------
// Produced server-side right after a set is logged, so the UI can show "here's
// what just changed and what to do next" instead of dead-ending on a refresh.
export interface LoopAdaptation {
  lift: LiftType;
  exerciseName: string;
  whenLabel: string; // e.g. "Wed · Week 2"
  plannedWeight: number;
  suggestedWeight: number;
  reason: string;
  deload: boolean;
  changed: boolean; // suggestedWeight differs from the program's planned weight
  unit: Unit;
}

export interface LoopHandoff {
  adaptations: LoopAdaptation[];
  filmLift: 'squat' | 'bench' | 'deadlift' | null;
}

// A generated meal plan as persisted (one row per generation). `targets` is the
// macro snapshot at generation time — compared against the freshly computed
// targets on load to flag a plan as stale when the athlete's numbers change.
export interface SavedMealPlan {
  id: string;
  plan: MealPlan;
  targets: MacroTargets;
  steer: string | null;
  createdAt: number;
}

// ---------- Readiness (optional human override) ----------
// A daily self-report. The engine NEVER requires it and NEVER turns it into a
// deterministic deload — at most it surfaces a SOFT RPE ceiling the lifter can
// ignore. sleep/energy: 10 = best. soreness/stress/pain: 10 = worst. pain is the
// acute/joint-pain flag (distinct from training soreness) and is optional.
export interface ReadinessLog {
  id: string;
  athleteId: string;
  date: string; // ISO yyyy-mm-dd
  sleep: number; // 1-10, 10 = best
  energy: number; // 1-10, 10 = best
  soreness: number; // 1-10, 10 = worst
  stress: number; // 1-10, 10 = worst
  pain: number | null; // 1-10, 10 = worst; null = not reported
  painNote: string | null;
  note: string | null;
  createdAt: number;
}

export type ReadinessFlag = 'green' | 'amber' | 'red';

// The read-out the lifter sees. rpeCap is a SUGGESTED ceiling, never enforced;
// the headline is plain and honest, never a fake-precise number.
export interface ReadinessAssessment {
  flag: ReadinessFlag;
  score: number; // 0-100 composite, display only
  rpeCap: number | null; // soft suggested top-set RPE ceiling, or null
  headline: string;
  suggestions: string[];
  seePtAdvice: boolean; // acute pain → nudge toward a PT, not a deload
}

// ---------- Decision rules (Phase 4) ----------
// Pure, composable findings surfaced in the weekly review. These ADVISE; they do
// not mutate the autoregulation engine (adjustExercise) or the program.
export type DecisionSeverity = 'info' | 'suggest' | 'caution';

export interface DecisionFinding {
  rule: string; // stable id, e.g. 'soreness-streak'
  lift: LiftType | null;
  severity: DecisionSeverity;
  title: string;
  detail: string; // honest explanation of the signal
  action: string; // concrete, optional next step
}

// ---------- Weekly review (planned vs actual + the Sunday tweak) ----------
export interface PlannedActual {
  label: string;
  planned: string;
  actual: string;
  onTrack: boolean;
}

export interface WeeklyReview {
  weekStart: string; // ISO yyyy-mm-dd (Sunday)
  blockName: string | null;
  sessions: PlannedActual;
  rows: PlannedActual[]; // per-metric planned vs actual
  findings: DecisionFinding[];
  sundayTweak: string; // the one change to make next week (or "hold the line")
}

// ---------- Coach console (B2B human-in-the-loop layer) ----------
// The engines propose; the coach approves/edits/rejects. Nothing reaches a
// coached athlete's program until the coach signs off.

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

// One proposed load change for the next scheduled occurrence of a lift.
// Carries (weekNumber, dayNumber, exerciseName) so an approval can be applied
// to the program JSON later without re-deriving the occurrence.
export interface LoadSuggestionPayload {
  lift: LiftType;
  exerciseName: string;
  weekNumber: number;
  dayNumber: number;
  dayName: string;
  plannedWeight: number;
  suggestedWeight: number;
  reason: string;
  deload: boolean;
  unit: Unit;
}

export interface CoachSuggestion {
  id: string;
  coachId: string;
  athleteId: string;
  kind: 'load_adjust';
  payload: LoadSuggestionPayload;
  editedWeight: number | null; // coach's override of suggestedWeight, if any
  status: SuggestionStatus;
  source: string | null; // which engine produced it, e.g. 'autoregulation'
  coachNote: string | null;
  createdAt: number;
  resolvedAt: number | null;
}

export interface RosterEntry {
  athleteId: string;
  name: string | null;
  email: string;
  hasProfile: boolean;
  lastSessionDate: string | null; // ISO yyyy-mm-dd
  daysSinceLastSession: number | null; // null = never logged
  pendingSuggestions: number;
}

export interface TriageFlag {
  severity: DecisionSeverity;
  title: string;
  detail: string;
}

// One roster row in the "who needs attention this week" queue, ranked by score.
export interface TriageItem {
  athleteId: string;
  name: string | null;
  email: string;
  score: number;
  flags: TriageFlag[];
  daysSinceLastSession: number | null;
  pendingSuggestions: number;
}
