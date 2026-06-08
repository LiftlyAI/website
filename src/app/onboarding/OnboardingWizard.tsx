'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PlateSpinner } from '@/components/ui/PlateSpinner';
import type { AthleteProfile } from '@/lib/types';

const TOTAL_STEPS = 5;

const empty: AthleteProfile = {
  name: '',
  email: '',
  age: 25,
  sex: 'male',
  bodyweight: 180,
  unit: 'lbs',
  height: '5\'10"',
  bodyFatPct: undefined,
  targetWeightClass: undefined,

  experience: 'intermediate',
  currentMaxes: { squat: null, bench: null, deadlift: null },
  squatStyle: 'unsure',
  deadliftStance: 'unsure',
  benchGrip: 'unsure',
  equipment: 'sleeves',

  trainingDaysPerWeek: 4,
  goal: 'total_max',
  meetDate: null,
  injuries: '',

  dietaryRestrictions: ['none'],
  phaseGoal: 'maintaining',
  mealsPerDay: 4,
  allergies: '',
  foodPreferences: '',
};

export function OnboardingWizard({ email, initialName }: { email: string; initialName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<AthleteProfile>({
    ...empty,
    email,
    name: initialName,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to save');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'failed to save';
      setError(msg);
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-iron-950">
        <PlateSpinner label="Building your program…" />
        <p className="text-sm text-chalk-mute font-body max-w-sm text-center mt-4">
          Your coach is reading your profile, picking accessories around your weak points, and
          calculating working weights. This takes 30-90 seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-iron-950">
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="stencil-heading text-xs tracking-widest text-chalk-mute">
            STEP {step} OF {TOTAL_STEPS}
          </span>
          <span className="font-mono text-xs text-chalk-mute">
            {Math.round((step / TOTAL_STEPS) * 100)}%
          </span>
        </div>
        <div className="h-1 bg-iron-800 w-full">
          <div
            className="h-full bg-blood transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          {step === 1 && <Step1 profile={profile} update={update} />}
          {step === 2 && <Step2 profile={profile} update={update} />}
          {step === 3 && <Step3 profile={profile} update={update} />}
          {step === 4 && <Step4 profile={profile} update={update} />}
          {step === 5 && <Step5 profile={profile} update={update} />}

          {error && <div className="text-sm text-rpe-max font-mono mt-4">{error}</div>}

          <div className="flex justify-between gap-3 mt-10">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              ← Back
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={() => setStep((s) => s + 1)}>Next →</Button>
            ) : (
              <Button onClick={submit}>Generate Program →</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Step components ----------------

function StepHeader({ num, title, subtitle }: { num: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <div className="font-mono text-xs text-blood mb-2 tracking-[0.3em]">— {num.toString().padStart(2, '0')} —</div>
      <h2 className="stencil-heading text-4xl text-chalk leading-tight">{title}</h2>
      <div className="accent-divider mt-3 max-w-[60px]" />
      {subtitle && <p className="text-sm text-chalk-mute mt-3 font-body">{subtitle}</p>}
    </div>
  );
}

type StepProps = {
  profile: AthleteProfile;
  update: <K extends keyof AthleteProfile>(k: K, v: AthleteProfile[K]) => void;
};

function Step1({ profile, update }: StepProps) {
  return (
    <div>
      <StepHeader num={1} title="Personal Stats" subtitle="Used for BMR, programming volume, and weight-class targeting." />
      <div className="space-y-5">
        <Input
          label="Name"
          value={profile.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Your name"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Age"
            type="number"
            min={14}
            max={90}
            value={profile.age}
            onChange={(e) => update('age', parseInt(e.target.value, 10) || 0)}
          />
          <Select
            label="Sex (for BMR)"
            value={profile.sex}
            onChange={(e) => update('sex', e.target.value as 'male' | 'female')}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Bodyweight"
            type="number"
            step="0.1"
            value={profile.bodyweight}
            onChange={(e) => update('bodyweight', parseFloat(e.target.value) || 0)}
          />
          <Select
            label="Unit"
            value={profile.unit}
            onChange={(e) => update('unit', e.target.value as 'lbs' | 'kg')}
            options={[
              { value: 'lbs', label: 'lbs' },
              { value: 'kg', label: 'kg' },
            ]}
          />
        </div>
        <Input
          label="Height"
          value={profile.height}
          onChange={(e) => update('height', e.target.value)}
          placeholder='e.g. 5&apos;11" or 180cm'
          hint="Format: 5'11&quot; or 180cm"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Body fat % (optional)"
            type="number"
            step="0.5"
            value={profile.bodyFatPct ?? ''}
            onChange={(e) =>
              update('bodyFatPct', e.target.value === '' ? undefined : parseFloat(e.target.value))
            }
            hint="Used for Katch-McArdle BMR"
          />
          <Input
            label={`Target weight class ${profile.unit} (optional)`}
            type="number"
            value={profile.targetWeightClass ?? ''}
            onChange={(e) =>
              update(
                'targetWeightClass',
                e.target.value === '' ? undefined : parseFloat(e.target.value),
              )
            }
            hint="83, 93, 105, 120…"
          />
        </div>
      </div>
    </div>
  );
}

function Step2({ profile, update }: StepProps) {
  const setMax = (lift: 'squat' | 'bench' | 'deadlift', val: string) => {
    const maxes = { ...profile.currentMaxes };
    maxes[lift] = val === '' ? null : parseFloat(val);
    update('currentMaxes', maxes);
  };

  return (
    <div>
      <StepHeader
        num={2}
        title="Training Background"
        subtitle="Drives the periodization model. Be honest: overstating experience leads to crap programs."
      />
      <div className="space-y-5">
        <Select
          label="Experience"
          value={profile.experience}
          onChange={(e) => update('experience', e.target.value as AthleteProfile['experience'])}
          options={[
            { value: 'novice', label: 'Novice (<1 year, still adding weight every session)' },
            { value: 'intermediate', label: 'Intermediate (1-3 years, weekly progression)' },
            { value: 'advanced', label: 'Advanced (3+ years, monthly progression at best)' },
          ]}
        />

        <div>
          <div className="stencil-heading text-xs text-chalk-dim mb-3">
            CURRENT 1-REP MAXES — leave blank if unknown
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Squat"
              type="number"
              value={profile.currentMaxes.squat ?? ''}
              onChange={(e) => setMax('squat', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Bench"
              type="number"
              value={profile.currentMaxes.bench ?? ''}
              onChange={(e) => setMax('bench', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Deadlift"
              type="number"
              value={profile.currentMaxes.deadlift ?? ''}
              onChange={(e) => setMax('deadlift', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Squat style"
            value={profile.squatStyle}
            onChange={(e) => update('squatStyle', e.target.value as AthleteProfile['squatStyle'])}
            options={[
              { value: 'high_bar', label: 'High bar' },
              { value: 'low_bar', label: 'Low bar' },
              { value: 'unsure', label: 'Not sure' },
            ]}
          />
          <Select
            label="Deadlift stance"
            value={profile.deadliftStance}
            onChange={(e) =>
              update('deadliftStance', e.target.value as AthleteProfile['deadliftStance'])
            }
            options={[
              { value: 'conventional', label: 'Conventional' },
              { value: 'sumo', label: 'Sumo' },
              { value: 'unsure', label: 'Not sure' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Bench grip"
            value={profile.benchGrip}
            onChange={(e) => update('benchGrip', e.target.value as AthleteProfile['benchGrip'])}
            options={[
              { value: 'close', label: 'Close (≈ shoulder width)' },
              { value: 'medium', label: 'Medium (1-2 fingers from rings)' },
              { value: 'wide', label: 'Wide (at the rings)' },
              { value: 'unsure', label: 'Not sure' },
            ]}
          />
          <Select
            label="Equipment"
            value={profile.equipment}
            onChange={(e) => update('equipment', e.target.value as AthleteProfile['equipment'])}
            options={[
              { value: 'raw', label: 'Raw (no gear)' },
              { value: 'sleeves', label: 'Sleeves' },
              { value: 'wraps', label: 'Wraps' },
              { value: 'belt_only', label: 'Belt only' },
              { value: 'fully_equipped', label: 'Fully equipped' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Step3({ profile, update }: StepProps) {
  return (
    <div>
      <StepHeader num={3} title="Schedule & Goals" subtitle="Plan the next 12 weeks." />
      <div className="space-y-5">
        <Select
          label="Training days per week"
          value={String(profile.trainingDaysPerWeek)}
          onChange={(e) =>
            update('trainingDaysPerWeek', parseInt(e.target.value, 10) as 3 | 4 | 5 | 6)
          }
          options={[
            { value: '3', label: '3 days' },
            { value: '4', label: '4 days' },
            { value: '5', label: '5 days' },
            { value: '6', label: '6 days' },
          ]}
        />
        <Select
          label="Primary goal"
          value={profile.goal}
          onChange={(e) => update('goal', e.target.value as AthleteProfile['goal'])}
          options={[
            { value: 'total_max', label: 'Maximize total (no specific meet)' },
            { value: 'meet_prep', label: 'Prep for a meet' },
            { value: 'recomp', label: 'Body recomposition' },
            { value: 'general_strength', label: 'General strength' },
          ]}
        />
        <Input
          label="Meet date (optional)"
          type="date"
          value={profile.meetDate ?? ''}
          onChange={(e) => update('meetDate', e.target.value || null)}
          hint="Setting this enables meet-prep peaking timing"
        />
        <Textarea
          label="Current injuries or pain points"
          value={profile.injuries}
          onChange={(e) => update('injuries', e.target.value)}
          placeholder="e.g. mild left knee discomfort at high volume; right shoulder cranky on bench"
          hint="Used to auto-modify exercise selection and volume"
          rows={4}
        />
      </div>
    </div>
  );
}

function Step4({ profile, update }: StepProps) {
  const restrictions: AthleteProfile['dietaryRestrictions'] = profile.dietaryRestrictions;
  const toggle = (val: AthleteProfile['dietaryRestrictions'][number]) => {
    if (val === 'none') {
      update('dietaryRestrictions', ['none']);
      return;
    }
    const next = restrictions.filter((r) => r !== 'none');
    if (next.includes(val)) update('dietaryRestrictions', next.filter((r) => r !== val) as AthleteProfile['dietaryRestrictions']);
    else update('dietaryRestrictions', [...next, val]);
  };

  return (
    <div>
      <StepHeader
        num={4}
        title="Nutrition"
        subtitle="Your stats drive the macros. Your coach generates the meal plans."
      />
      <div className="space-y-5">
        <Select
          label="Current phase"
          value={profile.phaseGoal}
          onChange={(e) => update('phaseGoal', e.target.value as AthleteProfile['phaseGoal'])}
          options={[
            { value: 'gaining', label: 'Gaining (lean bulk, +0.5-1 lb/week)' },
            { value: 'maintaining', label: 'Maintaining' },
            { value: 'cutting', label: 'Cutting (-0.5-1 lb/week)' },
          ]}
        />
        <Input
          label="Meals per day"
          type="number"
          min={3}
          max={7}
          value={profile.mealsPerDay}
          onChange={(e) => update('mealsPerDay', parseInt(e.target.value, 10) || 4)}
        />
        <div>
          <div className="stencil-heading text-xs text-chalk-dim mb-2">DIETARY RESTRICTIONS</div>
          <div className="flex flex-wrap gap-2">
            {(['none', 'vegetarian', 'vegan', 'lactose_free', 'gluten_free'] as const).map((r) => {
              const active = restrictions.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
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
        <Textarea
          label="Allergies — never included"
          value={profile.allergies ?? ''}
          onChange={(e) => update('allergies', e.target.value)}
          placeholder="e.g. peanuts, shellfish, eggs"
          hint="Hard constraint. Enforced on every generated meal plan."
          rows={2}
        />
        <Textarea
          label="Food preferences (optional)"
          value={profile.foodPreferences ?? ''}
          onChange={(e) => update('foodPreferences', e.target.value)}
          placeholder="Cuisines you like, foods you avoid, time or budget limits"
          hint="Soft preferences — honoured when they fit your macros."
          rows={2}
        />
      </div>
    </div>
  );
}

function Step5({ profile }: StepProps) {
  const m = profile.currentMaxes;
  return (
    <div>
      <StepHeader num={5} title="Review" subtitle="Fix anything that's off, then hit Generate." />
      <div className="chalk-card p-5 font-mono text-sm space-y-3">
        <Row k="Athlete" v={profile.name || '—'} />
        <Row k="Stats" v={`${profile.age}y · ${profile.sex} · ${profile.bodyweight}${profile.unit} · ${profile.height}`} />
        <Row k="Experience" v={profile.experience} />
        <Row
          k="Maxes"
          v={`SQ ${m.squat ?? '?'} · BP ${m.bench ?? '?'} · DL ${m.deadlift ?? '?'}`}
        />
        <Row k="Style" v={`${profile.squatStyle} squat · ${profile.deadliftStance} DL · ${profile.benchGrip} bench`} />
        <Row k="Equipment" v={profile.equipment} />
        <Row k="Schedule" v={`${profile.trainingDaysPerWeek}x/week · goal: ${profile.goal}`} />
        {profile.meetDate && <Row k="Meet" v={profile.meetDate} />}
        {profile.injuries.trim() && <Row k="Injuries" v={profile.injuries} />}
        <Row k="Phase" v={`${profile.phaseGoal} · ${profile.mealsPerDay} meals/day`} />
        <Row k="Diet" v={profile.dietaryRestrictions.join(', ')} />
        {profile.allergies?.trim() && <Row k="Allergies" v={profile.allergies} />}
        {profile.foodPreferences?.trim() && <Row k="Food prefs" v={profile.foodPreferences} />}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
      <span className="text-chalk-mute uppercase text-xs tracking-widest sm:w-32 shrink-0">
        {k}
      </span>
      <span className="text-chalk break-words">{v}</span>
    </div>
  );
}
