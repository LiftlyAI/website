// Coach-console data assembly — the DB-touching half (mirrors review-data.ts).
// Pulls roster rows and the per-athlete inputs, then hands off to the pure
// triage / suggestion engines. Callers are responsible for the ownership check
// (requireCoachOwns) BEFORE reaching for any athlete id in here.

import { execute, query, queryOne, uuid } from './db';
import { computeWeeklyReview } from './review-data';
import { buildTriage, type TriageInput } from './triage';
import type {
  AthleteProfile,
  CoachSuggestion,
  LoadSuggestionPayload,
  Program,
  RosterEntry,
  SessionLog,
  SessionLogEntry,
  TriageItem,
} from './types';

function daysSince(dateISO: string | null, now = new Date()): number | null {
  if (!dateISO) return null;
  const then = new Date(`${dateISO}T00:00:00`);
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
}

export async function listRoster(coachId: string): Promise<RosterEntry[]> {
  const rows = await query<{
    athleteId: string;
    name: string | null;
    email: string;
    hasProfile: boolean;
    lastDate: string | null;
    pending: number;
  }>(
    `SELECT a.id AS "athleteId", a.name, a.email,
            (a.profile_json IS NOT NULL) AS "hasProfile",
            (SELECT MAX(date) FROM session_logs s WHERE s.athlete_id = a.id) AS "lastDate",
            (SELECT COUNT(*) FROM coach_suggestions cs
              WHERE cs.athlete_id = a.id AND cs.coach_id = ca.coach_id
                AND cs.status = 'pending') AS pending
     FROM coach_athletes ca
     JOIN athletes a ON a.id = ca.athlete_id
     WHERE ca.coach_id = ? AND ca.status = 'active'
     ORDER BY a.name, a.email`,
    [coachId],
  );

  return rows.map((r) => ({
    athleteId: r.athleteId,
    name: r.name,
    email: r.email,
    hasProfile: !!r.hasProfile,
    lastSessionDate: r.lastDate,
    daysSinceLastSession: daysSince(r.lastDate),
    pendingSuggestions: Number(r.pending),
  }));
}

// The roster-wide AI first pass: run the existing weekly-review/decision-rule
// engines per client and rank who needs the coach's eyes.
export async function triageForCoach(coachId: string): Promise<TriageItem[]> {
  const roster = await listRoster(coachId);
  const inputs: TriageInput[] = await Promise.all(
    roster.map(async (r) => ({
      athleteId: r.athleteId,
      name: r.name,
      email: r.email,
      findings: r.hasProfile ? (await computeWeeklyReview(r.athleteId))?.findings ?? [] : [],
      daysSinceLastSession: r.daysSinceLastSession,
      pendingSuggestions: r.pendingSuggestions,
    })),
  );
  return buildTriage(inputs);
}

// ---------- Per-athlete inputs for the suggestion engine ----------

export interface AthleteCoachingData {
  profile: AthleteProfile;
  program: Program;
  programId: string;
  currentWeek: number;
  logs: SessionLog[];
}

export async function loadCoachingData(athleteId: string): Promise<AthleteCoachingData | null> {
  const aRow = await queryOne<{ profile_json: string | null }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [athleteId],
  );
  if (!aRow?.profile_json) return null;
  const profile = JSON.parse(aRow.profile_json) as AthleteProfile;

  const pRow = await queryOne<{ id: string; program_json: string; current_week: number }>(
    'SELECT id, program_json, current_week FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [athleteId],
  );
  if (!pRow) return null;

  // ~60 days covers any practical autoregulation window (matches handoff.ts).
  const sinceMs = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const logRows = await query<{ date: string; exercises_json: string }>(
    `SELECT date, exercises_json FROM session_logs
       WHERE athlete_id = ? AND created_at >= ?
       ORDER BY date DESC`,
    [athleteId, sinceMs],
  );
  const logs: SessionLog[] = logRows.map((r) => ({
    id: '',
    athleteId,
    date: r.date,
    weekNumber: 0,
    dayNumber: 0,
    exercises: JSON.parse(r.exercises_json) as SessionLogEntry[],
    createdAt: 0,
  }));

  return {
    profile,
    program: JSON.parse(pRow.program_json) as Program,
    programId: pRow.id,
    currentWeek: pRow.current_week,
    logs,
  };
}

// ---------- The pending queue ----------

// Regenerate semantics: a fresh first pass replaces any still-pending load
// suggestions for that athlete (stale proposals in a 55-client queue are worse
// than none). Approved/rejected rows are history and never touched.
export async function replacePendingLoadSuggestions(
  coachId: string,
  athleteId: string,
  payloads: LoadSuggestionPayload[],
  source: string,
): Promise<number> {
  await execute(
    "DELETE FROM coach_suggestions WHERE coach_id = ? AND athlete_id = ? AND status = 'pending' AND kind = 'load_adjust'",
    [coachId, athleteId],
  );
  for (const p of payloads) {
    await execute(
      `INSERT INTO coach_suggestions
         (id, coach_id, athlete_id, kind, payload_json, status, source, created_at)
       VALUES (?, ?, ?, 'load_adjust', ?, 'pending', ?, ?)`,
      [uuid(), coachId, athleteId, JSON.stringify(p), source, Date.now()],
    );
  }
  return payloads.length;
}

interface SuggestionRow {
  id: string;
  coach_id: string;
  athlete_id: string;
  kind: string;
  payload_json: string;
  edited_weight: number | null;
  status: string;
  source: string | null;
  coach_note: string | null;
  created_at: number;
  resolved_at: number | null;
}

function toSuggestion(r: SuggestionRow): CoachSuggestion {
  return {
    id: r.id,
    coachId: r.coach_id,
    athleteId: r.athlete_id,
    kind: 'load_adjust',
    payload: JSON.parse(r.payload_json) as LoadSuggestionPayload,
    editedWeight: r.edited_weight,
    status: r.status as CoachSuggestion['status'],
    source: r.source,
    coachNote: r.coach_note,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

export async function listSuggestions(
  coachId: string,
  athleteId: string,
): Promise<CoachSuggestion[]> {
  const rows = await query<SuggestionRow>(
    `SELECT * FROM coach_suggestions
       WHERE coach_id = ? AND athlete_id = ?
       ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 50`,
    [coachId, athleteId],
  );
  return rows.map(toSuggestion);
}

export async function getSuggestion(id: string): Promise<CoachSuggestion | null> {
  const row = await queryOne<SuggestionRow>('SELECT * FROM coach_suggestions WHERE id = ?', [id]);
  return row ? toSuggestion(row) : null;
}
