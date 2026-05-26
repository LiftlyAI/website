'use client';
import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlateSpinner } from '@/components/ui/PlateSpinner';
import type { AthleteProfile, MacroTargets, MealPlan } from '@/lib/types';

export function NutritionView({
  profile,
  targets,
}: {
  profile: AthleteProfile;
  targets: MacroTargets;
}) {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nutrition/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setPlan(data.plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  const proteinCals = targets.protein_g * 4;
  const carbCals = targets.carbs_g * 4;
  const fatCals = targets.fat_g * 9;
  const total = proteinCals + carbCals + fatCals;
  const pPct = (proteinCals / total) * 100;
  const cPct = (carbCals / total) * 100;
  const fPct = (fatCals / total) * 100;

  return (
    <div className="px-8 py-10 max-w-6xl">
      <div className="mb-8">
        <div className="font-mono text-xs text-chalk-mute tracking-widest mb-1">FUEL</div>
        <h1 className="stencil-heading text-5xl text-chalk leading-none">NUTRITION</h1>
        <div className="accent-divider mt-3 max-w-[120px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Card className="md:col-span-1">
          <CardHeader title="Daily Targets" subtitle={profile.phaseGoal.toUpperCase()} accent />

          {/* Macro ring (CSS conic) */}
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
            <Row label="Protein" g={targets.protein_g} pct={pPct} dot="bg-blood" />
            <Row label="Carbs" g={targets.carbs_g} pct={cPct} dot="bg-rpe-mod" />
            <Row label="Fat" g={targets.fat_g} pct={fPct} dot="bg-rpe-easy" />
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
              <span>Protein/kg</span>
              <span>{targets.proteinPerKg.toFixed(1)} g/kg</span>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Today's Meal Plan" accent />

          {!plan && !loading && (
            <div>
              <p className="text-sm text-chalk-mute mb-4">
                Generate a meal plan honoring your macros, dietary restrictions, and meal count
                preference. Plans are training-day defaults — eat slightly more carbs on training
                days, slightly less on rest days.
              </p>
              <Button onClick={generate}>Generate Meal Plan</Button>
            </div>
          )}

          {loading && <PlateSpinner label="Cooking…" />}

          {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}

          {plan && (
            <div className="space-y-5">
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
              <Button variant="ghost" onClick={generate}>
                Generate a different plan
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Supplements */}
      <Card>
        <CardHeader title="Supplements (evidence-based)" subtitle="optional, not required" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Supp
            name="Creatine monohydrate"
            dose="3-5 g/day, any time"
            evidence="A"
            note="Most-studied ergogenic aid. Loads over 4-6 weeks. Saturate first, dose can be daily."
          />
          <Supp
            name="Caffeine"
            dose="3-6 mg/kg, 30-60 min pre-training"
            evidence="A"
            note="Improves output 2-7%. Cycle off occasionally to maintain sensitivity."
          />
          <Supp
            name="Beta-alanine"
            dose="3.2-6.4 g/day"
            evidence="B"
            note="Helps in higher-rep volume blocks. Tingling is harmless."
          />
        </div>
      </Card>
    </div>
  );
}

function Row({ label, g, pct, dot }: { label: string; g: number; pct: number; dot: string }) {
  return (
    <div className="flex items-center justify-between text-chalk-dim">
      <span className="flex items-center gap-2">
        <span className={`w-2 h-2 ${dot}`} />
        <span className="text-chalk-mute uppercase text-xs tracking-widest">{label}</span>
      </span>
      <span className="data-num text-chalk">
        {g}g <span className="text-chalk-mute text-xs">({Math.round(pct)}%)</span>
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
  name,
  dose,
  evidence,
  note,
}: {
  name: string;
  dose: string;
  evidence: string;
  note: string;
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
