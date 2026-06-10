import type { LoopAdaptation, ReadinessAssessment } from '../types';

// One honest line from the coach after a loop event (a logged session or a
// readiness check-in). Deliberately tiny: the value is a human-sounding read on
// what just happened, not another paragraph of generic advice.
export interface CoachNoteContext {
  event: 'log' | 'readiness';
  athleteName: string;
  experience: string;
  goal: string;
  loggedSummary: string | null; // e.g. "Squat 150x3 @8, Bench 100x5 @7"
  changedAdaptations: LoopAdaptation[]; // only the ones that moved
  readiness: ReadinessAssessment | null;
}

export function buildCoachNotePrompt(ctx: CoachNoteContext): { system: string; user: string } {
  const system = `You are ${ctx.athleteName}'s powerlifting coach. Write ONE sentence — a short, human read on what just happened. Rules:
- Max ~30 words, one line, plain text. No markdown, no emoji, no greeting, no sign-off.
- Sound like a real coach glancing at the log, not a motivational poster.
- Be specific to the numbers you're given. If nothing notable happened, say something honest and low-key.
- Never invent data you weren't given. Never fake precision about RPE or readiness.
- If readiness is amber/red or pain was flagged, acknowledge it as the lifter's call, not an order.`;

  const adapt = ctx.changedAdaptations.length
    ? ctx.changedAdaptations
        .map((a) => `${a.exerciseName} → ${a.suggestedWeight}${a.unit} (${a.reason})`)
        .join('; ')
    : '(no target changes)';

  const readiness = ctx.readiness
    ? `flag=${ctx.readiness.flag}, ${ctx.readiness.headline}`
    : '(none logged)';

  const user = `Athlete: ${ctx.athleteName} — ${ctx.experience}, goal: ${ctx.goal}.
Event: ${ctx.event === 'log' ? 'just logged a session' : 'just logged a readiness check-in'}.
Logged: ${ctx.loggedSummary ?? '(n/a)'}.
Auto-tuned next targets: ${adapt}.
Readiness: ${readiness}.

Write the one-line coach note now.`;

  return { system, user };
}
