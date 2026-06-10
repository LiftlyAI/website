// Triage — pure ranking of "who needs attention this week" across a roster
// (mirrors decision-rules.ts: plain inputs, no DB handles, unit-testable).
// Score weights are coarse on purpose: this orders a coach's queue, it does
// not pretend to measure athlete state.

import type { DecisionFinding, DecisionSeverity, TriageFlag, TriageItem } from './types';

export interface TriageInput {
  athleteId: string;
  name: string | null;
  email: string;
  findings: DecisionFinding[]; // from evaluateDecisions, [] when no data
  daysSinceLastSession: number | null; // null = never logged
  pendingSuggestions: number;
}

const SEVERITY_SCORE: Record<DecisionSeverity, number> = {
  caution: 3,
  suggest: 2,
  info: 1,
};

const STALE_DAYS = 7;

export function buildTriage(inputs: TriageInput[]): TriageItem[] {
  return inputs
    .map((i) => {
      const flags: TriageFlag[] = i.findings.map((f) => ({
        severity: f.severity,
        title: f.title,
        detail: f.detail,
      }));
      let score = i.findings.reduce((s, f) => s + SEVERITY_SCORE[f.severity], 0);

      if (i.daysSinceLastSession == null) {
        flags.push({
          severity: 'info',
          title: 'No sessions logged yet',
          detail: 'This client has never logged a session — check they are set up.',
        });
        score += 1;
      } else if (i.daysSinceLastSession >= STALE_DAYS) {
        flags.push({
          severity: 'caution',
          title: `No session in ${i.daysSinceLastSession} days`,
          detail: 'Training has gone quiet — worth a check-in before they drift.',
        });
        score += 3;
      }

      // Pending approvals are the coach's own backlog: nudge, don't dominate.
      score += Math.min(i.pendingSuggestions, 3);

      return {
        athleteId: i.athleteId,
        name: i.name,
        email: i.email,
        score,
        flags,
        daysSinceLastSession: i.daysSinceLastSession,
        pendingSuggestions: i.pendingSuggestions,
      };
    })
    .sort(
      (a, b) => b.score - a.score || (a.name ?? a.email).localeCompare(b.name ?? b.email),
    );
}
