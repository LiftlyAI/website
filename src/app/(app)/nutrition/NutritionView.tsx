'use client';
import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlateSpinner } from '@/components/ui/PlateSpinner';
import { Textarea } from '@/components/ui/Input';
import type { AthleteProfile, MacroTargets, MealPlan, SavedMealPlan } from '@/lib/types';
import { fetchWithTimeout } from '@/lib/utils';

export function NutritionView({
  profile,
  targets,
  initialPlan = null,
  initialStale = false,
}: {
  profile: AthleteProfile;
  targets: MacroTargets;
  initialPlan?: SavedMealPlan | null;
  initialStale?: boolean;
}) {
  const [plan, setPlan] = useState<MealPlan | null>(initialPlan?.plan ?? null);
  const [currentDiet, setCurrentDiet] = useState(profile.currentDiet ?? '');
  const [editInstruction, setEditInstruction] = useState('');
  const [stale, setStale] = useState(initialStale);
  // Three independent actions, each with its own in-flight flag so the right
  // button spins and the others stay enabled.
  const [optimizing, setOptimizing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = optimizing || generating || editing;

  // Restructure the athlete's existing diet (the primary path).
  async function optimize() {
    if (!currentDiet.trim()) {
      setError('Tell us what you currently eat first.');
      return;
    }
    setOptimizing(true);
    setError(null);
    try {
      const res = await fetchWithTimeout('/api/nutrition/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentDiet: currentDiet.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed');
      setPlan(data.plan);
      setStale(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setOptimizing(false);
    }
  }

  // Build a plan from scratch (secondary path, kept for people without a routine).
  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetchWithTimeout('/api/nutrition/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed');
      setPlan(data.plan);
      setStale(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setGenerating(false);
    }
  }

  // Apply a plain-language tweak to the saved plan ("swap the chicken for beef").
  async function applyEdit() {
    if (!editInstruction.trim()) return;
    setEditing(true);
    setError(null);
    try {
      const res = await fetchWithTimeout('/api/nutrition/edit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ instruction: editInstruction.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed');
      setPlan(data.plan);
      setEditInstruction('');
      setStale(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setEditing(false);
    }
  }

  const proteinCals = targets.protein_g * 4;
  const carbCals = targets.carbs_g * 4;
  const fatCals = targets.fat_g * 9;
  const total = proteinCals + carbCals + fatCals;
  const pPct = (proteinCals / total) * 100;
  const cPct = (carbCals / total) * 100;
  const fPct = (fatCals / total) * 100;

  const phaseLabel =
    profile.phaseGoal === 'gaining'
      ? 'LEAN GAIN'
      : profile.phaseGoal === 'cutting'
      ? 'FAT LOSS'
      : 'MAINTAIN';

  const phaseRate =
    profile.phaseGoal === 'gaining'
      ? '+0.25–0.5% BW/wk'
      : profile.phaseGoal === 'cutting'
      ? '−0.5–1% BW/wk'
      : 'Hold ± 0.5 kg';

  const isVegan = profile.dietaryRestrictions.includes('vegan');
  const isVegetarian = profile.dietaryRestrictions.includes('vegetarian');
  const dietaryActive = profile.dietaryRestrictions.filter((r) => r !== 'none');
  const hasAllergies = !!(profile.allergies && profile.allergies.trim());

  return (
    <div className="stagger px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-6xl">
      <div className="mb-8">
        <div className="page-kicker mb-2">// FUEL</div>
        <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">NUTRITION</h1>
        <div className="accent-divider mt-3 max-w-[120px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {/* ── Daily Targets ── */}
        <Card className="md:col-span-1">
          <CardHeader title="Daily Targets" subtitle={phaseLabel} accent />

          {/* Macro ring */}
          <div className="flex items-center justify-center my-6">
            <div
              className="w-40 h-40 rounded-full relative"
              style={{
                background: `conic-gradient(
                  #E8440A 0% ${pPct}%,
                  #FACC15 ${pPct}% ${pPct + cPct}%,
                  #4ADE80 ${pPct + cPct}% 100%
                )`,
              }}
            >
              <div className="absolute inset-3 rounded-full bg-iron-900 flex flex-col items-center justify-center">
                <div className="data-num text-3xl text-chalk leading-none">{targets.calories}</div>
                <div className="font-mono text-[10px] text-chalk-mute mt-1">KCAL</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 font-mono text-sm">
            <Row label="Protein" g={targets.protein_g} pct={pPct} sub={`${targets.proteinPerKg.toFixed(1)} g/kg`} dot="bg-blood" />
            <Row label="Carbs" g={targets.carbs_g} pct={cPct} sub={`${targets.carbsPerKg.toFixed(1)} g/kg`} dot="bg-rpe-mod" />
            <Row label="Fat" g={targets.fat_g} pct={fPct} sub={`${targets.fatPerKg.toFixed(1)} g/kg`} dot="bg-rpe-easy" />
          </div>

          <div className="border-t border-iron-800 pt-4 mt-5 space-y-1 text-xs font-mono text-chalk-mute">
            <div className="flex justify-between">
              <span>BMR</span>
              <span>{targets.bmr} kcal</span>
            </div>
            <div className="flex justify-between">
              <span>TDEE</span>
              <span>{targets.tdee} kcal</span>
            </div>
            <div className="flex justify-between">
              <span>Phase adj.</span>
              <span>
                {targets.phaseAdjustment >= 0 ? '+' : ''}
                {targets.phaseAdjustment} kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span>Per-meal protein</span>
              <span>~{targets.perMealProteinG}g</span>
            </div>
          </div>

          {/* Phase guidance */}
          <div className="border-t border-iron-800 pt-4 mt-4">
            <div className="font-mono text-[10px] text-chalk-mute tracking-widest mb-2">PHASE GUIDANCE</div>
            <div className="text-xs text-chalk-dim space-y-1.5">
              <div>
                <span className="text-chalk font-mono">Rate target: </span>
                {phaseRate}
              </div>
              <div>Weigh daily, use weekly average. Adjust ±100–200 kcal if off-pace for 2+ weeks.</div>
              {profile.phaseGoal === 'gaining' && (
                <div>If waist outpacing everything else → trim 100–200 kcal.</div>
              )}
              {profile.phaseGoal === 'cutting' && (
                <div>Strength holding = success. Diet breaks (1–2 wks at TDEE) help on cuts &gt;8 wks.</div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Meal Plan ── */}
        <Card className="md:col-span-2">
          <CardHeader title="Today&apos;s Meal Plan" accent />

          {stale && (
            <div className="text-xs font-mono text-rpe-mod mb-3 border border-rpe-mod/30 px-3 py-2">
              Your macro targets changed since this plan was generated. Regenerate to match your current numbers.
            </div>
          )}

          {(dietaryActive.length > 0 || hasAllergies) && (
            <div className="text-[11px] font-mono text-chalk-mute mb-3 space-y-0.5">
              {dietaryActive.length > 0 && (
                <div>
                  <span className="text-chalk-dim">Diet:</span>{' '}
                  {dietaryActive.map((r) => r.replace('_', '-')).join(', ')}
                </div>
              )}
              {hasAllergies && (
                <div>
                  <span className="text-rpe-max">Avoiding:</span> {profile.allergies}
                </div>
              )}
            </div>
          )}

          {!plan && !busy && (
            <div>
              <p className="text-sm text-chalk-mute mb-3">
                Already eat the same things most days? Tell us what that looks like and we&apos;ll
                restructure it to hit your macros — adjust portions, swap to better versions, and
                give you a short shopping list. No need to overhaul what you eat.
              </p>
              <Textarea
                label="What do you eat on a normal day?"
                value={currentDiet}
                onChange={(e) => setCurrentDiet(e.target.value)}
                placeholder={
                  'e.g. Breakfast: 4 eggs + 1 cup oats + banana\nLunch: 200g chicken + white rice + broccoli\nSnack: protein shake\nDinner: ground beef + pasta'
                }
                hint="Rough is fine. Allergies & restrictions above are always enforced."
                rows={5}
              />
              {(isVegan || isVegetarian) && (
                <div className="text-xs font-mono text-rpe-mod my-3 border border-rpe-mod/30 px-3 py-2">
                  {isVegan
                    ? 'Vegan: per-meal protein bumped +20% for leucine threshold; pea/rice/soy sources used.'
                    : 'Vegetarian: dairy + egg proteins prioritised for leucine density.'}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <Button onClick={optimize}>Optimize my diet</Button>
                <button
                  type="button"
                  onClick={generate}
                  className="font-mono text-xs text-chalk-mute hover:text-chalk underline underline-offset-2"
                >
                  or build me a plan from scratch
                </button>
              </div>
            </div>
          )}

          {optimizing && <PlateSpinner label="Restructuring…" />}
          {generating && <PlateSpinner label="Cooking…" />}

          {error && <div className="text-sm text-rpe-max font-mono mb-2">{error}</div>}

          {plan && !optimizing && !generating && (
            <div className="space-y-5">
              {plan.changes && plan.changes.length > 0 && (
                <div className="chalk-card p-4 border border-blood/40">
                  <div className="stencil-heading text-xs text-blood mb-2 tracking-widest">
                    CHANGES TO MAKE
                  </div>
                  <ul className="text-sm text-chalk-dim space-y-1.5">
                    {plan.changes.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-blood shrink-0">→</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {plan.meals.map((m, i) => (
                  <div key={i} className="border-b border-iron-800 pb-4 last:border-b-0">
                    <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
                      <div>
                        <div className="stencil-heading text-lg text-chalk">{m.name}</div>
                        <div className="font-mono text-xs text-chalk-mute">{m.timing}</div>
                      </div>
                      <div className="font-mono text-xs text-chalk-mute">
                        <span className="text-blood">P {m.protein_g}</span> ·{' '}
                        <span className="text-rpe-mod">C {m.carbs_g}</span> ·{' '}
                        <span className="text-rpe-easy">F {m.fat_g}</span>
                        <span className="text-chalk-mute"> · {m.calories} kcal</span>
                      </div>
                    </div>
                    <ul className="text-sm text-chalk-dim mt-2 space-y-0.5">
                      {m.items.map((it, j) => (
                        <li key={j}>
                          <span className="text-chalk">•</span> {it.quantity} {it.food}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Mini title="Pre-workout" body={plan.preWorkout} />
                <Mini title="Post-workout" body={plan.postWorkout} />
              </div>
              {plan.notes && plan.notes.length > 0 && (
                <div>
                  <div className="stencil-heading text-xs text-blood mb-2">Notes</div>
                  <ul className="text-sm text-chalk-dim space-y-1">
                    {plan.notes.map((n, i) => (
                      <li key={i}>— {n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conversational editing — no fiddly fields, just tell the coach. */}
              <div className="border-t border-iron-800 pt-4">
                <Textarea
                  label="Tell the coach to tweak it"
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="e.g. swap the chicken for ground beef · add a 3pm snack · make breakfast bigger · I'm out of oats"
                  hint="Plain language. The coach rewrites the plan and keeps your macros on target."
                  rows={2}
                />
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Button onClick={applyEdit} disabled={editing || !editInstruction.trim()}>
                    {editing ? 'Applying…' : 'Apply change'}
                  </Button>
                  <button
                    type="button"
                    onClick={optimize}
                    disabled={busy}
                    className="font-mono text-xs text-chalk-mute hover:text-chalk underline underline-offset-2 disabled:opacity-50"
                  >
                    re-optimize from what I eat
                  </button>
                  <button
                    type="button"
                    onClick={generate}
                    disabled={busy}
                    className="font-mono text-xs text-chalk-mute hover:text-chalk underline underline-offset-2 disabled:opacity-50"
                  >
                    start over from scratch
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Hydration + Supplements ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <Card className="md:col-span-1">
          <CardHeader title="Hydration" subtitle="daily baseline" />
          <div className="space-y-2 text-xs font-mono mt-2">
            <div className="text-chalk text-sm">3–4 L / day for hard training</div>
            <div className="text-chalk-mute">Scale up with heat, sweat rate, and body size.</div>
            <div className="text-chalk-mute">Check: pale-straw urine + stable morning weight.</div>
            <div className="pt-2 border-t border-iron-800 text-chalk-mute">
              Electrolytes (Na, K, Mg) matter on high-sweat days and during any acute weight-class cut.
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Supplements" subtitle="evidence-tiered · the small rock, not the foundation" />
          <div className="space-y-4">
            <div>
              <div className="font-mono text-[10px] tracking-widest text-chalk-mute mb-2">STRONG EVIDENCE</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Supp
                  name="Creatine monohydrate"
                  dose="3–5 g/day, any time"
                  evidence="A"
                  note="Most reliable ergogenic aid. Plain monohydrate. Fancier forms cost more and work the same. Saturates in ~3–4 wks. Normal 1–2 kg scale gain = water. Vegans see the biggest response."
                />
                <Supp
                  name="Caffeine"
                  dose="3–6 mg/kg, 60 min pre-session"
                  evidence="A"
                  note="Improves strength, power, and work capacity. Above ~9 mg/kg = more jitters, no extra benefit. Cycle off to maintain sensitivity. Mind the sleep cut-off."
                />
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-widest text-chalk-mute mb-2">SITUATIONAL</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Supp
                  name="Beta-alanine"
                  dose="4–6 g/day, split, 4+ wks"
                  evidence="B"
                  note="Helps sustained high-effort sets (1–4 min). Best in high-volume blocks, not max singles. Harmless tingling (paraesthesia) is expected."
                />
                <Supp
                  name="Vitamin D / Omega-3 / Multi"
                  dose="Address actual deficiencies"
                  evidence="B"
                  note="Useful in winter, low-sun climates, or restricted diets. Vegans: B12 is non-negotiable; algae oil for omega-3. Don't megadose beyond normal ranges."
                />
              </div>
            </div>
            <div className="border-t border-iron-800 pt-3">
              <div className="font-mono text-[10px] tracking-widest text-chalk-mute mb-1">SKIP / OVERRATED</div>
              <p className="text-xs text-chalk-dim">
                BCAAs (redundant when total protein is adequate) · testosterone &quot;boosters&quot; · proprietary pre-workout blends beyond their caffeine content · anything promising fat loss without a calorie deficit.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label, g, pct, sub, dot,
}: {
  label: string; g: number; pct: number; sub: string; dot: string;
}) {
  return (
    <div className="flex items-center justify-between text-chalk-dim">
      <span className="flex items-center gap-2 shrink-0">
        <span className={`w-2 h-2 ${dot}`} />
        <span className="text-chalk-mute uppercase text-xs tracking-widest">{label}</span>
      </span>
      <span className="text-right">
        <span className="data-num text-chalk">{g}g</span>
        <span className="text-chalk-mute text-[10px] ml-1">({Math.round(pct)}% · {sub})</span>
      </span>
    </div>
  );
}

function Mini({ title, body }: { title: string; body: string }) {
  return (
    <div className="chalk-card p-4">
      <div className="stencil-heading text-xs text-blood mb-1 tracking-widest">{title}</div>
      <p className="text-sm text-chalk-dim">{body}</p>
    </div>
  );
}

function Supp({
  name, dose, evidence, note,
}: {
  name: string; dose: string; evidence: string; note: string;
}) {
  return (
    <div className="border border-iron-700 p-4">
      <div className="flex items-baseline justify-between mb-1">
        <div className="stencil-heading text-sm text-chalk">{name}</div>
        <span className="font-mono text-[10px] tracking-widest border border-blood text-blood px-1.5 py-0.5">
          {evidence}
        </span>
      </div>
      <div className="font-mono text-xs text-chalk-mute mb-2">{dose}</div>
      <p className="text-xs text-chalk-dim">{note}</p>
    </div>
  );
}
