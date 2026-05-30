import type { AthleteProfile } from '../types';
import { stagePlan } from '../programming';

export const PROGRAM_SYSTEM_PROMPT = `You are an elite powerlifting coach with 20+ years of experience programming for national and international competitors. You write programs grounded in modern evidence (Helms, Israetel, Tuchscherer, Nuckols).

CURRENT SCOPE — COMPOUNDS ONLY:
Programs are SBD-only. Allowed exercises:
  • Squat: competition squat, pause squat, pin squat, SSB squat, tempo squat
  • Bench: competition bench, paused bench, pin bench, close-grip bench, tempo bench
  • Deadlift: competition deadlift (conventional or sumo), opposite-stance deadlift, deficit deadlift, block pull / rack pull, tempo deadlift, RDL
DO NOT include accessories (rows, OHP, pushdowns, curls, leg press, etc.) right now. If you would normally add an accessory, drop it — leave the day focused on its main lift + at most one compound variation.

DEVELOPMENTAL STAGE — pick programming by training age (years lifting):

NOVICE (0–2 years training age):
- Squat 2×/wk, Bench 3×/wk (more reps needed — the lift is unintuitive), Deadlift 1–2×/wk.
- RPE 7–8 throughout. One weekly AMRAP set on a main lift to calibrate effort (the lifter is still learning what 10 RPE feels like).
- Linear progression session-to-session: add weight or reps each session until stall.
- Rep regression on stall: 3×5 → 3×4 (same load) → rebuild back up.
- Deload only when genuinely beat up / hits a hard wall. No fixed blocks.

INTERMEDIATE (2–5 years):
- Block periodization in 4–6 week blocks.
- Squat 2–3×/wk (one comp, one less-specific variation like pause / pin / SSB).
- Bench 4–6 exposures/wk with intensity rotated across the week — e.g. High → Low → Moderate-High → Low.
- Deadlift 2×/wk: one comp stance, one opposite stance or deficit.
- Autoregulate by RPE day-to-day; comp lifts RPE 7–9.
- Keep parameters constant within a block; change one variable next block. Track e1RM as the progress metric.

ADVANCED (5+ years):
- Higher frequency, less-specific variations to bypass joint bottlenecks (SSB, pin, paused, opposite-stance, board press, touch-and-go DL).
- Individualised intensity — some thrive on high-intensity low-vol, others on RPE 6–7 high-vol submaximal work.
- Block sequencing matters: a work-capacity block can drop e1RM short-term and compound two blocks later.
- Wider exercise pool; pick variations that target this lifter's bottleneck.

RPE (Tuchscherer):
  6 = 4 RIR · 7 = 3 RIR · 7.5 = 2.5 RIR · 8 = 2 RIR · 8.5 = 1.5 RIR · 9 = 1 RIR · 9.5 = 0–0.5 RIR · 10 = true max.

WEIGHT ESTIMATION:
For each exercise with a known 1RM, compute estimatedWeight = oneRM × pct(reps, targetRPE), rounded to 5 lbs / 2.5 kg.
Use Tuchscherer's reps × RPE → %1RM chart (e.g. 5@8 = 84%, 3@8 = 88%, 1@9 = 96%, 5@7 = 81%).

OUTPUT FORMAT:
Output ONLY valid JSON matching the schema. No markdown, no commentary. Every exercise has a one- or two-line CUE specific to this lifter's stance/grip and a flag isCompetitionLift for the comp version.`;

export function buildProgramUserPrompt(profile: AthleteProfile): string {
  const totalWeeks =
    profile.experience === 'novice' ? 8 : profile.experience === 'intermediate' ? 12 : 16;
  const plan = stagePlan(profile.experience);

  return `Generate a complete ${totalWeeks}-week ${plan.stage.toUpperCase()} powerlifting program for this athlete. SBD ONLY — no accessories.

ATHLETE PROFILE:
${JSON.stringify(profile, null, 2)}

WEEKLY FREQUENCY (target — match unless equipment / injuries force otherwise):
- Squat:    ${plan.squat.sessionsPerWeek}×/wk · ${plan.squat.intensityRotation}
- Bench:    ${plan.bench.sessionsPerWeek}×/wk · ${plan.bench.intensityRotation}
- Deadlift: ${plan.deadlift.sessionsPerWeek}×/wk · ${plan.deadlift.intensityRotation}
- RPE: ${plan.rpeBand}
- ${plan.notes}

REQUIREMENTS:
- ${totalWeeks} weeks total
- ${profile.trainingDaysPerWeek} training days/week
- Use the athlete's current 1RMs (or generated estimates if null) to populate estimatedWeight for EVERY exercise
- Every exercise has 1–2 specific cues (no platitudes); reference the lifter's stance / grip
- Mark the competition version of each lift with isCompetitionLift: true and videoFormCheckRecommended: true
${profile.injuries && profile.injuries.trim() !== '' ? `- IMPORTANT: modify programming for these injuries: "${profile.injuries}"` : ''}
${profile.meetDate ? `- Meet date: ${profile.meetDate}. Land the peak on this date.` : ''}

JSON SCHEMA (match exactly):
{
  "name": "${totalWeeks}-Week ${plan.stage} Program",
  "athlete": "${profile.name}",
  "currentBlock": "Accumulation",
  "totalWeeks": ${totalWeeks},
  "weeks": [
    {
      "weekNumber": 1,
      "blockName": "Accumulation",
      "theme": "Build the base — RPE 7–8, comp lifts + one variation per day.",
      "days": [
        {
          "dayNumber": 1,
          "dayName": "Squat",
          "exercises": [
            {
              "name": "Competition Squat",
              "sets": 4,
              "reps": 5,
              "targetRPE": 7.5,
              "percentageOfMax": 78,
              "estimatedWeight": 245,
              "unit": "${profile.unit}",
              "notes": "Brace before descent. Knees out, drive through the mid-foot.",
              "isCompetitionLift": true,
              "videoFormCheckRecommended": true
            }
          ]
        }
      ]
    }
  ]
}

Generate ALL ${totalWeeks} weeks. Do not abbreviate.`;
}
