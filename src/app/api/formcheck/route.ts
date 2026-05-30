import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { aiGenerate, isAiKeyError, safeParseJson } from '@/lib/ai';
import { buildFormCheckPrompt, systemPromptFor } from '@/lib/prompts/formcheck';
import { analyzeVideo, CvServiceError } from '@/lib/cvService';
import { estimateRpe, type CalibrationPoint } from '@/lib/velocity';
import { toKg } from '@/lib/calculations';
import type { AthleteProfile, CvAnalysis, FormCheckResult, LiftType } from '@/lib/types';

type CvLift = 'bench' | 'squat' | 'deadlift';
const CV_LIFTS: readonly CvLift[] = ['bench', 'squat', 'deadlift'] as const;

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const video = form?.get('video');
  if (!form || !(video instanceof Blob) || video.size === 0) {
    return NextResponse.json({ error: 'attach a video file' }, { status: 400 });
  }

  const liftRaw = String(form.get('lift') ?? 'bench');
  if (!CV_LIFTS.includes(liftRaw as CvLift)) {
    return NextResponse.json(
      { error: `Unsupported lift '${liftRaw}'. Pick bench, squat, or deadlift.` },
      { status: 400 },
    );
  }
  const lift = liftRaw as CvLift;
  const stance = form.get('stance') ? String(form.get('stance')) : null;

  const db = getDb();
  const row = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string } | undefined;
  const athlete = row?.profile_json
    ? (JSON.parse(row.profile_json) as AthleteProfile)
    : undefined;

  const loadKgRaw = form.get('loadKg');
  const loadKg = loadKgRaw ? Number(loadKgRaw) : null;
  const userContext = String(form.get('userContext') ?? '');

  // 1. Pose-tracked bar path + form ---------------------------------------
  let cv: CvAnalysis;
  try {
    cv = await analyzeVideo({
      video,
      filename: (video as File).name ?? 'clip.mp4',
      lift,
    });
  } catch (err) {
    if (err instanceof CvServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'bar-path analysis failed' }, { status: 500 });
  }

  // 2. RPE from rep-time slowdown, calibrated to the lifter ----------------
  const calibRows = db
    .prepare(
      `SELECT slowdown_pct, actual_rpe FROM velocity_log
       WHERE athlete_id = ? AND lift_type = ?
         AND actual_rpe IS NOT NULL AND slowdown_pct IS NOT NULL
       ORDER BY created_at DESC LIMIT 40`,
    )
    .all(session.id, lift) as { slowdown_pct: number; actual_rpe: number }[];
  const history: CalibrationPoint[] = calibRows.map((r) => ({
    lossPct: r.slowdown_pct,
    rpe: r.actual_rpe,
  }));
  const lossPct = cv.summary.velocityLossPct;
  const rpe = estimateRpe(lossPct, history, lift as LiftType);

  // 3. Qualitative coaching, grounded in the measured numbers + path -------
  let aiText = '';
  try {
    const userPrompt = buildFormCheckPrompt({
      lift,
      cv,
      rpe,
      loadKg,
      userContext,
      stance,
      athlete,
    });
    aiText = await aiGenerate({
      system: systemPromptFor(lift as LiftType),
      messages: [{ role: 'user', content: userPrompt }],
      images: cv.overlayPng
        ? [{ mediaType: 'image/png', dataBase64: cv.overlayPng }]
        : undefined,
      maxTokens: 2000,
      temperature: 0.3,
      json: true,
    });
  } catch (err: unknown) {
    // CV still succeeded — degrade gracefully rather than losing the analysis.
    const why = isAiKeyError(err)
      ? 'No AI key configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.local).'
      : 'AI coaching commentary was unavailable for this submission.';
    aiText = JSON.stringify({
      overall: `Bar-path metrics captured. ${why} The measured numbers below are still valid.`,
      _error: err instanceof Error ? err.message : 'ai unavailable',
    });
  }

  const parsedAnalysis = safeParseJson<Record<string, unknown>>(aiText);
  const storedAnalysis = parsedAnalysis ? JSON.stringify(parsedAnalysis) : aiText;
  const bodyweightKg = athlete ? toKg(athlete.bodyweight, athlete.unit) : null;

  const id = uuid();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  try {
    db.prepare(
      `INSERT INTO form_checks
         (id, athlete_id, lift_type, video_path, frames_count, user_context,
          ai_analysis, estimated_rpe, rpe_confidence, load_kg, cv_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      session.id,
      lift,
      null,
      cv.pose.totalFrames,
      userContext,
      storedAnalysis,
      rpe.value,
      rpe.confidence,
      loadKg,
      JSON.stringify(cv),
      now,
    );

    // Track this set for calibration; actual RPE is filled in when the lifter
    // confirms it (POST /api/formcheck/calibrate).
    db.prepare(
      `INSERT INTO velocity_log
         (id, athlete_id, form_check_id, lift_type, load_kg, bodyweight_kg,
          reps, slowdown_pct, actual_rpe, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    ).run(
      uuid(),
      session.id,
      id,
      lift,
      loadKg,
      bodyweightKg,
      cv.summary.repCount,
      lossPct,
      today,
      now,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'failed to save analysis';
    return NextResponse.json({ error: `could not save: ${msg}` }, { status: 500 });
  }

  const formCheck: FormCheckResult = {
    id,
    athleteId: session.id,
    liftType: lift as LiftType,
    videoPath: null,
    framesCount: cv.pose.totalFrames,
    userContext,
    aiAnalysis: storedAnalysis,
    estimatedRPE: rpe.value,
    rpeConfidence: rpe.confidence,
    loadKg,
    cv,
    createdAt: now,
  };

  return NextResponse.json({ ok: true, formCheck, rpe });
}
