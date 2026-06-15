import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { execute, query, queryOne, uuid } from '@/lib/db';
import { aiGenerate, isAiKeyError, safeParseJson } from '@/lib/ai';
import { assertFormCheckQuota, QuotaError } from '@/lib/limits';
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

  // Quota gate. The client also pre-flights /api/usage before the (expensive)
  // Modal upload; this is the authoritative server-side backstop.
  try {
    await assertFormCheckQuota(session.id);
  } catch (err) {
    if (err instanceof QuotaError) {
      return NextResponse.json(
        {
          error:
            "You've used all your form checks for this period. Upgrade your plan for more.",
          quota: err.info,
        },
        { status: 402 },
      );
    }
    throw err;
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid form data' }, { status: 400 });

  const liftRaw = String(form.get('lift') ?? 'bench');
  if (!CV_LIFTS.includes(liftRaw as CvLift)) {
    return NextResponse.json(
      { error: `Unsupported lift '${liftRaw}'. Pick bench, squat, or deadlift.` },
      { status: 400 },
    );
  }
  const lift = liftRaw as CvLift;
  const stance = form.get('stance') ? String(form.get('stance')) : null;

  const row = await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  );
  const athlete = row?.profile_json
    ? (JSON.parse(row.profile_json) as AthleteProfile)
    : undefined;

  const loadKgRaw = form.get('loadKg');
  const loadKg = loadKgRaw ? Number(loadKgRaw) : null;
  const userContext = String(form.get('userContext') ?? '');

  // 1. Pose-tracked bar path + form ---------------------------------------
  // Production: client calls Modal directly and sends cv_json here (avoids
  // Vercel's 4.5 MB body limit and 60s timeout for video uploads).
  // Local dev fallback: send video blob and we call the CV service server-side.
  let cv: CvAnalysis;
  const cvJsonRaw = form.get('cv_json');
  if (cvJsonRaw) {
    try {
      const parsed = JSON.parse(String(cvJsonRaw));
      if (!parsed || typeof parsed !== 'object') throw new Error();
      cv = parsed as CvAnalysis;
    } catch {
      return NextResponse.json({ error: 'invalid cv_json' }, { status: 400 });
    }
  } else {
    const video = form.get('video');
    if (!(video instanceof Blob) || video.size === 0) {
      return NextResponse.json({ error: 'attach a video file or provide cv_json' }, { status: 400 });
    }
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
  }

  // 2. RPE from rep-time slowdown, calibrated to the lifter ----------------
  const calibRows = await query<{ slowdown_pct: number; actual_rpe: number }>(
    `SELECT slowdown_pct, actual_rpe FROM velocity_log
       WHERE athlete_id = ? AND lift_type = ?
         AND actual_rpe IS NOT NULL AND slowdown_pct IS NOT NULL
       ORDER BY created_at DESC LIMIT 40`,
    [session.id, lift],
  );
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
    await execute(
      `INSERT INTO form_checks
         (id, athlete_id, lift_type, video_path, frames_count, user_context,
          ai_analysis, estimated_rpe, rpe_confidence, load_kg, cv_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ],
    );

    // Track this set for calibration; actual RPE is filled in when the lifter
    // confirms it (POST /api/formcheck/calibrate).
    await execute(
      `INSERT INTO velocity_log
         (id, athlete_id, form_check_id, lift_type, load_kg, bodyweight_kg,
          reps, slowdown_pct, actual_rpe, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
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
      ],
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
