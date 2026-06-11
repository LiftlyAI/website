import { requireSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import type { AthleteProfile, Program } from '@/lib/types';
import { ProgramView } from './ProgramView';

export default async function ProgramPage() {
  const session = await requireSession();

  const athlete = (await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  ))!;
  const profile = JSON.parse(athlete.profile_json) as AthleteProfile;

  const programRow = await queryOne<{
    id: string;
    program_json: string;
    current_week: number;
    current_block: string;
  }>(
    'SELECT id, program_json, current_week, current_block FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [session.id],
  );

  if (!programRow) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-5xl">
        <h1 className="stencil-heading text-4xl mb-4 text-chalk">Program</h1>
        <div className="chalk-card p-6 text-chalk-mute">
          No program yet. Try regenerating from your profile.
        </div>
      </div>
    );
  }

  const program = JSON.parse(programRow.program_json) as Program;

  return (
    <ProgramView
      profile={profile}
      program={program}
      currentWeek={programRow.current_week}
      programId={programRow.id}
    />
  );
}
