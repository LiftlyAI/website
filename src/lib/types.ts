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
