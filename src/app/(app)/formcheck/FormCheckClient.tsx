'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, X, AlertTriangle, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Textarea, Input } from '@/components/ui/Input';
import { RPEBadge } from '@/components/ui/RPEBadge';
import { PlateSpinner } from '@/components/ui/PlateSpinner';
import type { FormCheckResult, CvAnalysis, RpeConfidence } from '@/lib/types';
import { fmtDate } from '@/lib/utils';

const CONF_LABEL: Record<RpeConfidence, string> = {
  measured: 'Measured · your slowdown→RPE profile',
  estimated: 'Estimating · calibrating to you',
  rough: 'Rough · velocity-loss research',
};

export function FormCheckClient({ initialChecks }: { initialChecks: FormCheckResult[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState(initialChecks);

  return (
    <div className="stagger px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-5xl">
      <div className="mb-8 flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <div className="page-kicker mb-2">// COACH&apos;S DESK</div>
          <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">FORM CHECK</h1>
          <div className="accent-divider mt-3 max-w-[120px]" />
          <p className="text-sm text-chalk-mute mt-3 max-w-xl">
            Bench, squat, deadlift. The system finds the lifter in the clip (standing
            spotters ignored on bench, bystanders on squat/DL), tracks the bar path,
            times every rep's concentric, and reads effort from how much the last reps
            slow vs the first.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Submit a clip</Button>
      </div>

      {checks.length === 0 ? (
        <Card>
          <div className="text-chalk-mute text-sm">
            No clips yet. Pick the lift and film with a <strong>fixed</strong> camera:
            side view for squat and deadlift, foot-of-bench for bench. Keep the lifter's
            whole body and loaded plate in frame, well lit. Film around spotters and
            bystanders; the system ignores them.
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {checks.map((c) => (
            <FormCheckCard key={c.id} check={c} onCalibrated={() => router.refresh()} />
          ))}
        </div>
      )}

      {open && (
        <UploadModal
          onClose={() => setOpen(false)}
          onSuccess={(check) => {
            setChecks((prev) => [check, ...prev]);
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

interface Analysis {
  overall?: string;
  phaseFindings?: Record<string, string>;
  barPath?: string;
  effortContext?: string;
  priorityCues?: string[];
  workingWell?: string[];
  nextSession?: string;
  _error?: string;
}

function FormCheckCard({
  check,
  onCalibrated,
}: {
  check: FormCheckResult;
  onCalibrated: () => void;
}) {
  const [deep, setDeep] = useState(false);
  let parsed: Analysis | null = null;
  try {
    parsed = JSON.parse(check.aiAnalysis) as Analysis;
  } catch {
    /* raw fallback below */
  }
  // Only the new pose-based contract has `cv.pose`. Older rows -> AI-text only.
  const cv = check.cv && check.cv.pose ? check.cv : null;
  const s = cv?.summary;
  const cues = parsed?.priorityCues ?? [];

  return (
    <Card>
      {/* ---------- QUICK READ (always visible) ---------- */}
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-xs text-chalk-mute tracking-widest mb-1">
            {fmtDate(check.createdAt)}
            {check.loadKg != null && ` · ${check.loadKg} kg`}
            {s && ` · ${s.repCount} reps`}
          </div>
          <div className="stencil-heading text-2xl text-chalk">
            {check.liftType.toUpperCase()}
          </div>
        </div>
        {check.estimatedRPE != null && (
          <div className="text-right">
            <RPEBadge rpe={check.estimatedRPE} />
            <div className="text-[10px] font-mono text-chalk-mute mt-1">
              {s?.rir != null && `RIR ${s.rir} · `}
              {check.rpeConfidence && CONF_LABEL[check.rpeConfidence]}
            </div>
          </div>
        )}
      </div>

      {cv?.warnings.map((w, i) => (
        <div
          key={i}
          className="bg-rpe-mod/10 border border-rpe-mod/40 p-2.5 mt-3 text-xs text-rpe-mod flex gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{w}</span>
        </div>
      ))}

      {check.userContext && (
        <div className="border-l-2 border-iron-700 pl-3 italic text-sm text-chalk-mute mt-3">
          You said: "{check.userContext}"
        </div>
      )}

      {parsed?.overall && (
        <p className="text-sm text-chalk mt-4 leading-relaxed">{parsed.overall}</p>
      )}

      {cues.length > 0 && (
        <div className="mt-4">
          <div className="stencil-heading text-xs tracking-widest mb-2 text-blood">
            DO THIS NEXT
          </div>
          <ol className="space-y-1.5">
            {cues.slice(0, 2).map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-chalk">
                <span className="text-blood font-mono">{i + 1}.</span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {s && (
        <p className="text-xs font-mono text-chalk-mute mt-4">
          {s.firstRepConcentricS ?? '—'}s → {s.lastRepConcentricS ?? '—'}s ={' '}
          <span className="text-blood">{s.velocityLossPct ?? '—'}% slowdown</span>
          {s.wallRepIndex != null && (
            <span className="text-rpe-hard"> · wall @ rep {s.wallRepIndex}</span>
          )}
        </p>
      )}

      {/* The loop action — log this clip as a session — lives up here in the
          quick read, not buried in the deep analysis. */}
      <div className="mt-4">
        <LogAsSessionControl check={check} />
      </div>

      <button
        onClick={() => setDeep((d) => !d)}
        className="mt-4 flex items-center gap-1.5 text-xs font-mono text-chalk-mute hover:text-chalk transition-colors"
      >
        {deep ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {deep ? 'Hide deep analysis' : 'Deep analysis'}
      </button>

      {/* ---------- DEEP ANALYSIS (collapsible) ---------- */}
      {deep && (
        <div className="mt-5 pt-5 border-t border-iron-800 space-y-5">
          {cv && cv.overlayPng && (
            <div>
              <SectionTitle>Tracked skeleton + bar path</SectionTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${cv.overlayPng}`}
                alt="Tracked skeleton and bar path"
                className="w-full max-w-2xl border border-iron-800"
              />
              <div className="text-xs text-chalk-mute font-mono mt-1.5">
                {s?.barPathNote} · pose {cv.pose.quality} (
                {(cv.pose.coverage * 100).toFixed(0)}% of frames, {cv.fps} fps)
              </div>
            </div>
          )}

          {s && (
            <div>
              <SectionTitle>Effort · concentric time (chest → lockout)</SectionTitle>
              <p className="text-sm text-chalk-dim">
                First rep{' '}
                <span className="font-mono text-chalk">
                  {s.firstRepConcentricS ?? '—'}s
                </span>
                {' → '}last rep{' '}
                <span className="font-mono text-chalk">
                  {s.lastRepConcentricS ?? '—'}s
                </span>
                {' = '}
                <span className="font-mono text-blood">
                  {s.velocityLossPct ?? '—'}% slowdown
                </span>{' '}
                →{' '}
                <span className="text-blood font-mono">
                  RPE {check.estimatedRPE}
                  {s.rir != null && ` (RIR ${s.rir})`}
                </span>
                {check.rpeConfidence && (
                  <span className="text-chalk-mute"> · {CONF_LABEL[check.rpeConfidence]}</span>
                )}
                .
              </p>
              {parsed?.effortContext && (
                <p className="text-sm text-chalk-dim mt-2">{parsed.effortContext}</p>
              )}
            </div>
          )}

          {cv && <RepTable cv={cv} />}

          {s && s.formNotes.length > 0 && (
            <div>
              <SectionTitle>Measured form (what the body did)</SectionTitle>
              <ul className="list-disc list-inside space-y-1 text-sm text-chalk-dim">
                {s.formNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {parsed?.barPath && (
            <Block title="Bar Path Read">
              <p className="text-sm text-chalk-dim">{parsed.barPath}</p>
            </Block>
          )}
          {parsed?.phaseFindings && (
            <Block title="Phase Breakdown">
              <div className="space-y-2 font-body text-sm">
                {Object.entries(parsed.phaseFindings).map(([phase, body]) =>
                  body ? (
                    <div key={phase}>
                      <span className="font-mono uppercase text-[10px] tracking-widest text-blood">
                        {phase.replace(/([A-Z])/g, ' $1')}:
                      </span>{' '}
                      <span className="text-chalk-dim">{body}</span>
                    </div>
                  ) : null,
                )}
              </div>
            </Block>
          )}
          {parsed?.workingWell && parsed.workingWell.length > 0 && (
            <Block title="Working Well">
              <ul className="list-disc list-inside space-y-1 text-sm text-rpe-easy">
                {parsed.workingWell.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </Block>
          )}
          {parsed?.nextSession && (
            <Block title="Next Session">
              <p className="text-sm text-chalk-dim">{parsed.nextSession}</p>
            </Block>
          )}

          {!parsed && (
            <pre className="text-xs text-chalk-dim whitespace-pre-wrap font-mono">
              {check.aiAnalysis}
            </pre>
          )}

          <CalibrateControl
            formCheckId={check.id}
            current={check.estimatedRPE}
            onDone={onCalibrated}
          />
        </div>
      )}
    </Card>
  );
}

function LogAsSessionControl({ check }: { check: FormCheckResult }) {
  const cv = check.cv && check.cv.pose ? check.cv : null;
  const reps = cv?.summary?.repCount ?? 0;
  const ready = check.loadKg != null && check.estimatedRPE != null && reps > 0;
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [msg, setMsg] = useState('');

  async function logIt() {
    setState('saving');
    setMsg('');
    try {
      const res = await fetch('/api/session/log-from-formcheck', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formCheckId: check.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setState('done');
      setMsg(
        `Logged ${data.reps} × ${data.weight} ${data.unit} @ RPE ${data.rpe}. ` +
          `Your program will auto-adjust the next session of this lift.`,
      );
    } catch (e) {
      setState('idle');
      setMsg(e instanceof Error ? e.message : 'failed');
    }
  }

  return (
    <div className="bg-iron-900/50 border border-iron-800 p-3">
      <SectionTitle>Log this set as a session. Feeds your program.</SectionTitle>
      {!ready ? (
        <div className="text-xs text-chalk-mute">
          Add the load on this clip. Reps and RPE need to be measured before logging.
        </div>
      ) : state === 'done' ? (
        <div className="space-y-2">
          <div className="text-sm text-rpe-easy flex items-center gap-2">
            <Check className="w-4 h-4" /> {msg}
          </div>
          <Link
            href="/program"
            className="btn-ghost text-xs px-3 py-2 inline-flex items-center gap-2"
          >
            See it on your program <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="flex items-end gap-3 flex-wrap">
          <Button onClick={logIt} disabled={state === 'saving'} size="sm">
            {state === 'saving'
              ? 'Saving…'
              : `Log ${reps} × ${check.loadKg} kg @ RPE ${check.estimatedRPE}`}
          </Button>
          {msg && <span className="text-xs text-rpe-max font-mono">{msg}</span>}
        </div>
      )}
    </div>
  );
}

function RepTable({ cv }: { cv: CvAnalysis }) {
  if (cv.reps.length === 0) return null;
  return (
    <div>
      <SectionTitle>Per-rep</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono tabular-nums">
          <thead>
            <tr className="text-chalk-mute text-[10px] uppercase tracking-widest border-b border-iron-800">
              <th className="text-left py-1.5 pr-4">Rep</th>
              <th className="text-right py-1.5 pr-4">Concentric</th>
              <th className="text-right py-1.5 pr-4">Slowdown</th>
              <th className="text-right py-1.5 pr-4">Descent</th>
              <th className="text-right py-1.5 pr-4">Pause</th>
              <th className="text-right py-1.5 pr-4">Elbow lockout</th>
              <th className="text-right py-1.5">Flare</th>
            </tr>
          </thead>
          <tbody className="text-chalk-dim">
            {cv.reps.map((r) => (
              <tr key={r.index} className="border-b border-iron-900">
                <td className="py-1.5 pr-4 text-chalk">{r.index}</td>
                <td className="text-right py-1.5 pr-4 text-chalk">
                  {r.concentricS.toFixed(2)}s
                </td>
                <td className="text-right py-1.5 pr-4">
                  {r.slowdownVsFastestPct.toFixed(0)}%
                </td>
                <td className="text-right py-1.5 pr-4">{r.descentS.toFixed(2)}s</td>
                <td className="text-right py-1.5 pr-4">{r.pauseS.toFixed(2)}s</td>
                <td className="text-right py-1.5 pr-4">
                  {r.elbowAngleLockout != null
                    ? `${r.elbowAngleLockout.toFixed(0)}°`
                    : '—'}
                </td>
                <td className="text-right py-1.5">
                  {r.elbowFlareDeg != null ? `${r.elbowFlareDeg.toFixed(0)}°` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CalibrateControl({
  formCheckId,
  current,
  onDone,
}: {
  formCheckId: string;
  current: number | null;
  onDone: () => void;
}) {
  const [rpe, setRpe] = useState<string>(current != null ? String(current) : '8');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [msg, setMsg] = useState('');

  async function save() {
    setState('saving');
    try {
      const res = await fetch('/api/formcheck/calibrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formCheckId, actualRpe: Number(rpe) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setState('done');
      setMsg(
        `Logged. ${data.calibratedSets} calibrated set${
          data.calibratedSets === 1 ? '' : 's'
        } · profile is "${data.calibrationState}".`,
      );
      onDone();
    } catch (e) {
      setState('idle');
      setMsg(e instanceof Error ? e.message : 'failed');
    }
  }

  return (
    <div className="bg-iron-900/50 border border-iron-800 p-3">
      <SectionTitle>Confirm actual RPE. Teaches your slowdown profile.</SectionTitle>
      {state === 'done' ? (
        <div className="text-sm text-rpe-easy flex items-center gap-2">
          <Check className="w-4 h-4" /> {msg}
        </div>
      ) : (
        <div className="flex items-end gap-3 flex-wrap">
          <Select
            label="How did this set feel?"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            options={[
              { value: '6', label: 'RPE 6 · 4 reps left' },
              { value: '7', label: 'RPE 7 · 3 reps left' },
              { value: '7.5', label: 'RPE 7.5' },
              { value: '8', label: 'RPE 8 · 2 reps left' },
              { value: '8.5', label: 'RPE 8.5' },
              { value: '9', label: 'RPE 9 · 1 rep left' },
              { value: '9.5', label: 'RPE 9.5' },
              { value: '10', label: 'RPE 10 · nothing left' },
            ]}
            className="w-56"
          />
          <Button onClick={save} disabled={state === 'saving'}>
            {state === 'saving' ? 'Saving…' : 'Log it'}
          </Button>
          {msg && <span className="text-xs text-rpe-max font-mono">{msg}</span>}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="stencil-heading text-xs tracking-widest mb-2 text-chalk-mute">
      {children}
    </div>
  );
}

function Block({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={`stencil-heading text-xs tracking-widest mb-2 ${
          accent ? 'text-blood' : 'text-chalk-mute'
        }`}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ---------------- Upload modal ----------------

type SubmitLift = 'bench' | 'squat' | 'deadlift';

const FILMING_BY_LIFT: Record<SubmitLift, string> = {
  bench:
    'Camera at the FOOT OF THE BENCH or a clean side angle, fixed. Lifter\'s whole body in frame. A spotter is fine. The system analyses the person lying on the bench.',
  squat:
    'Pure SIDE view (or slight 45°), camera FIXED at hip height. The whole body must be in frame from top to bottom of the squat. The loaded plate fully visible.',
  deadlift:
    'Pure SIDE view, camera FIXED roughly at hip height. The bar, plates and lifter fully in frame from setup to lockout. Light the plate well.',
};

function UploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (check: FormCheckResult) => void;
}) {
  const [lift, setLift] = useState<SubmitLift>('bench');
  const [stance, setStance] = useState<'conventional' | 'sumo' | 'unsure'>('conventional');
  const [load, setLoad] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [context, setContext] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) {
      setError('Pick a video file first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('video', file, file.name);
      fd.append('lift', lift);
      if (lift === 'deadlift') fd.append('stance', stance);
      if (load) {
        const kg = unit === 'kg' ? Number(load) : Number(load) / 2.2046226218;
        fd.append('loadKg', String(Math.round(kg * 10) / 10));
      }
      fd.append('userContext', context);

      const res = await fetch('/api/formcheck', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'analysis failed');
      onSuccess(data.formCheck as FormCheckResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-start justify-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-xl chalk-card my-auto">
        <div className="flex items-center justify-between p-5 border-b border-iron-800">
          <div>
            <div className="font-mono text-xs text-chalk-mute">SUBMIT</div>
            <h2 className="stencil-heading text-2xl text-chalk">Form check</h2>
          </div>
          <button onClick={onClose} className="text-chalk-mute hover:text-chalk">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {submitting ? (
            <div className="flex flex-col items-center py-8">
              <PlateSpinner label={`Analysing ${lift}…`} />
              <p className="text-xs text-chalk-mute font-mono mt-2">
                Find the lifter, track the plate, time reps & read form. 20–90s.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Lift"
                  value={lift}
                  onChange={(e) => setLift(e.target.value as SubmitLift)}
                  options={[
                    { value: 'bench', label: 'Bench press' },
                    { value: 'squat', label: 'Back squat' },
                    { value: 'deadlift', label: 'Deadlift' },
                  ]}
                />
                {lift === 'deadlift' ? (
                  <Select
                    label="Stance"
                    value={stance}
                    onChange={(e) =>
                      setStance(e.target.value as 'conventional' | 'sumo' | 'unsure')
                    }
                    options={[
                      { value: 'conventional', label: 'Conventional' },
                      { value: 'sumo', label: 'Sumo' },
                      { value: 'unsure', label: 'Unsure' },
                    ]}
                  />
                ) : (
                  <div /> // keep grid cell so the layout stays consistent
                )}
              </div>

              <div className="bg-iron-900/50 border border-iron-800 p-3 text-xs text-chalk-mute">
                <span className="text-blood font-mono uppercase tracking-widest text-[10px]">
                  Film it right ·{' '}
                </span>
                {FILMING_BY_LIFT[lift]}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Load (optional)"
                  type="number"
                  inputMode="decimal"
                  value={load}
                  onChange={(e) => setLoad(e.target.value)}
                  placeholder="e.g. 100"
                  hint="Context for the coaching read."
                />
                <Select
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'kg' | 'lbs')}
                  options={[
                    { value: 'kg', label: 'kg' },
                    { value: 'lbs', label: 'lbs' },
                  ]}
                />
              </div>

              <Textarea
                label="Context (optional)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. felt like 2 left, bar stalled an inch off the chest"
                hint="What you noticed. Helps the coaching read."
              />

              <div>
                <div className="stencil-heading text-xs text-chalk-dim mb-1.5">VIDEO FILE</div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full chalk-card border-dashed py-8 text-center hover:border-blood transition-colors"
                >
                  <Upload className="w-6 h-6 text-blood mx-auto mb-2" />
                  <div className="text-sm text-chalk">
                    {file ? file.name : 'Click to choose a video'}
                  </div>
                  <div className="text-xs text-chalk-mute font-mono mt-1">
                    mp4, mov, webm · max ~80mb
                  </div>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
            </>
          )}
        </div>

        {!submitting && (
          <div className="flex justify-end gap-3 p-5 border-t border-iron-800">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!file}>
              Analyse
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
