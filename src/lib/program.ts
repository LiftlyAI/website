import { queryOne } from '@/lib/db';
import type { AthleteProfile, Program } from '@/lib/types';
import { safeJsonParse } from '@/lib/utils';

export interface ProgramData {
  profile: AthleteProfile;
  program: Program;
  currentWeek: number;
  programId: string;
}

/**
 * Shared "current program" load. The athlete-facing server component
 * (`(app)/program/page.tsx`) AND the native GET endpoint (`api/v1/program`)
 * both call this. Returns `null` when the athlete has no program yet.
 */
export async function getProgramData(athleteId: string): Promise<ProgramData | null> {
  const programRow = await queryOne<{
    id: string;
    program_json: string;
    current_week: number;
    current_block: string;
  }>(
    'SELECT id, program_json, current_week, current_block FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [athleteId],
  );
  if (!programRow) return null;

  const athlete = (await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [athleteId],
  ))!;
  const profile = safeJsonParse<AthleteProfile>(athlete.profile_json, {} as AthleteProfile);
  // A corrupt program row is treated as "no program" rather than crashing the page.
  const program = safeJsonParse<Program | null>(programRow.program_json, null);
  if (!program) return null;

  return { profile, program, currentWeek: programRow.current_week, programId: programRow.id };
}
