'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import type { AthleteProfile, DietaryRestriction } from '@/lib/types';

function toggleRestriction(curr: DietaryRestriction[], r: DietaryRestriction): DietaryRestriction[] {
  if (r === 'none') return ['none'];
  const next = curr.filter((x) => x !== 'none' && x !== r);
  const result = curr.includes(r) ? next : [...next, r];
  return result.length ? result : ['none'];
}

export function ProfileView({ profile, email }: { profile: AthleteProfile; email: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AthleteProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof AthleteProfile>(k: K, v: AthleteProfile[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile: draft, skipProgramGeneration: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'save failed');
      }
      setMsg('Profile saved.');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/program/regenerate', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'regenerate failed');
      }
      setMsg('New program generated.');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'failed');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-3xl">
      <div className="mb-8">
        <div className="font-mono text-xs text-chalk-mute tracking-widest mb-1">YOUR DATA</div>
        <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">PROFILE</h1>
        <div className="accent-divider mt-3 max-w-[120px]" />
      </div>

      {msg && <div className="text-sm text-rpe-easy font-mono mb-4">✓ {msg}</div>}
      {err && <div className="text-sm text-rpe-max font-mono mb-4">⚠ {err}</div>}

      <div className="space-y-5">
        <Card>
          <CardHeader title="Personal" />
          <div className="space-y-4">
            <Input label="Name" value={draft.name} onChange={(e) => update('name', e.target.value)} />
            <Input label="Email" value={email} disabled />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bodyweight"
                type="number"
                step="0.1"
                value={draft.bodyweight}
                onChange={(e) => update('bodyweight', parseFloat(e.target.value) || 0)}
              />
              <Select
                label="Unit"
                value={draft.unit}
                onChange={(e) => update('unit', e.target.value as 'lbs' | 'kg')}
                options={[
                  { value: 'lbs', label: 'lbs' },
                  { value: 'kg', label: 'kg' },
                ]}
              />
            </div>
            <Input
              label="Height"
              value={draft.height}
              onChange={(e) => update('height', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Maxes" />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Squat"
              type="number"
              value={draft.currentMaxes.squat ?? ''}
              onChange={(e) =>
                update('currentMaxes', {
                  ...draft.currentMaxes,
                  squat: e.target.value === '' ? null : parseFloat(e.target.value),
                })
              }
            />
            <Input
              label="Bench"
              type="number"
              value={draft.currentMaxes.bench ?? ''}
              onChange={(e) =>
                update('currentMaxes', {
                  ...draft.currentMaxes,
                  bench: e.target.value === '' ? null : parseFloat(e.target.value),
                })
              }
            />
            <Input
              label="Deadlift"
              type="number"
              value={draft.currentMaxes.deadlift ?? ''}
              onChange={(e) =>
                update('currentMaxes', {
                  ...draft.currentMaxes,
                  deadlift: e.target.value === '' ? null : parseFloat(e.target.value),
                })
              }
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Schedule & Phase" />
          <div className="space-y-4">
            <Select
              label="Training days/week"
              value={String(draft.trainingDaysPerWeek)}
              onChange={(e) =>
                update('trainingDaysPerWeek', parseInt(e.target.value, 10) as 3 | 4 | 5 | 6)
              }
              options={[
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
                { value: '6', label: '6' },
              ]}
            />
            <Select
              label="Phase"
              value={draft.phaseGoal}
              onChange={(e) => update('phaseGoal', e.target.value as AthleteProfile['phaseGoal'])}
              options={[
                { value: 'gaining', label: 'Gaining' },
                { value: 'maintaining', label: 'Maintaining' },
                { value: 'cutting', label: 'Cutting' },
              ]}
            />
            <Textarea
              label="Injuries / pain points"
              value={draft.injuries}
              onChange={(e) => update('injuries', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Nutrition" subtitle="drives your meal plans" />
          <div className="space-y-4">
            <div>
              <span className="block font-body font-medium text-xs uppercase tracking-wide text-chalk-dim mb-1.5">
                Dietary restrictions
              </span>
              <div className="flex flex-wrap gap-2">
                {(['none', 'vegetarian', 'vegan', 'lactose_free', 'gluten_free'] as const).map((r) => {
                  const active = draft.dietaryRestrictions.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        update('dietaryRestrictions', toggleRestriction(draft.dietaryRestrictions, r))
                      }
                      className={
                        active
                          ? 'px-3 py-2 stencil-heading text-xs tracking-widest border border-blood bg-blood text-iron-950'
                          : 'px-3 py-2 stencil-heading text-xs tracking-widest border border-iron-600 text-chalk-dim hover:border-blood hover:text-chalk'
                      }
                    >
                      {r.replace('_', '-')}
                    </button>
                  );
                })}
              </div>
            </div>
            <Input
              label="Meals per day"
              type="number"
              min={3}
              max={7}
              value={draft.mealsPerDay}
              onChange={(e) => update('mealsPerDay', parseInt(e.target.value, 10) || 4)}
            />
            <Textarea
              label="Allergies — never included"
              value={draft.allergies ?? ''}
              onChange={(e) => update('allergies', e.target.value)}
              placeholder="e.g. peanuts, shellfish"
              hint="Hard constraint — enforced on every meal plan."
            />
            <Textarea
              label="Food preferences"
              value={draft.foodPreferences ?? ''}
              onChange={(e) => update('foodPreferences', e.target.value)}
              placeholder="Cuisines you like, foods you avoid, time or budget"
              hint="Soft — honoured when it fits your macros."
            />
          </div>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <Button onClick={save} loading={saving}>
            Save Profile
          </Button>
          <Button variant="ghost" onClick={regenerate} loading={regenerating}>
            Regenerate Program
          </Button>
        </div>
      </div>
    </div>
  );
}
