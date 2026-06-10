// Coach-console data assembly — the DB-touching half (mirrors review-data.ts).
// Pulls roster rows and the per-athlete inputs, then hands off to the pure
// triage / suggestion engines. Callers are responsible for the ownership check
// (requireCoachOwns) BEFORE reaching for any athlete id in here.

import type DatabaseT from 'better-sqlite3';
import { uuid } from './db';
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

export function listRoster(db: DatabaseT.Database, coachId: string): RosterEntry[] {
  const rows = db
    .prepare(
      `SELECT a.id AS athleteId, a.name, a.email,
              (a.profile_json IS NOT NULL) AS hasProfile,
              (SELECT MAX(date) FROM session_logs s WHERE s.athlete_id = a.id) AS lastDate,
              (SELECT COUNT(*) FROM coach_suggestions cs
                WHERE cs.athlete_id = a.id AND cs.coach_id = ca.coach_id
                  AND cs.status = 'pending') AS pending
       FROM coach_athletes ca
       JOIN athletes a ON a.id = ca.athlete_id
       WHERE ca.coach_id = ? AND ca.status = 'active'
       ORDER BY a.name, a.email`,
    )
    .all(coachId) as {
    athleteId: string;
    name: string | null;
    email: string;
    hasProfile: number;
    lastDate: string | null;
    pending: number;
  }[];

  return rows.map((r) => ({
    athleteId: r.athleteId,
    name: r.name,
    email: r.email,
    hasProfile: !!r.hasProfile,
    lastSessionDate: r.lastDate,
    daysSinceLastSession: daysSince(r.lastDate),
    pendingSuggestions: r.pending,
  }));
}

// The roster-wide AI first pass: run the existing weekly-review/decision-rule
// engines per client and rank who needs the coach's eyes.
export function triageForCoach(db: DatabaseT.Database, coachId: string): TriageItem[] {
  const roster = listRoster(db, coachId);
  const inputs: TriageInput[] = roster.map((r) => ({
    athleteId: r.athleteId,
    name: r.name,
    email: r.email,
    findings: r.hasProfile ? computeWeeklyReview(db, r.athleteId)?.findings ?? [] : [],
    daysSinceLastSession: r.daysSinceLastSession,
    pendingSuggestions: r.pendingSuggestions,
  }));
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

export function loadCoachingData(
  db: DatabaseT.Database,
  athleteId: string,
): AthleteCoachingData | null {
  const aRow = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(athleteId) as { profile_json: string | null } | undefined;
  if (!aRow?.profile_json) return null;
  const profile = JSON.parse(aRow.profile_json) as AthleteProfile;

  const pRow = db
    .prepare(
      'SELECT id, program_json, current_week FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(athleteId) as { id: string; program_json: string; current_week: number } | undefined;
  if (!pRow) return null;

  // ~60 days covers any practical autoregulation window (matches handoff.ts).
  const sinceMs = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const logRows = db
    .prepare(
      `SELECT date, exercises_json FROM session_logs
       WHERE athlete_id = ? AND created_at >= ?
       ORDER BY date DESC`,
    )
    .all(athleteId, sinceMs) as { date: string; exercises_json: string }[];
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
export function replacePendingLoadSuggestions(
  db: DatabaseT.Database,
  coachId: string,
  athleteId: string,
  payloads: LoadSuggestionPayload[],
  source: string,
): number {
  const replace = db.transaction(() => {
    db.prepare(
      "DELETE FROM coach_suggestions WHERE coach_id = ? AND athlete_id = ? AND status = 'pending' AND kind = 'load_adjust'",
    ).run(coachId, athleteId);
    const insert = db.prepare(
      `INSERT INTO coach_suggestions
         (id, coach_id, athlete_id, kind, payload_json, status, source, created_at)
       VALUES (?, ?, ?, 'load_adjust', ?, 'pending', ?, ?)`,
    );
    for (const p of payloads) {
      insert.run(uuid(), coachId, athleteId, JSON.stringify(p), source, Date.now());
    }
  });
  replace();
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

export function listSuggestions(
  db: DatabaseT.Database,
  coachId: string,
  athleteId: string,
): CoachSuggestion[] {
  const rows = db
    .prepare(
      `SELECT * FROM coach_suggestions
       WHERE coach_id = ? AND athlete_id = ?
       ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 50`,
    )
    .all(coachId, athleteId) as SuggestionRow[];
  return rows.map(toSuggestion);
}

export function getSuggestion(
  db: DatabaseT.Database,
  id: string,
): CoachSuggestion | null {
  const row = db.prepare('SELECT * FROM coach_suggestions WHERE id = ?').get(id) as
    | SuggestionRow
    | undefined;
  return row ? toSuggestion(row) : null;
}
