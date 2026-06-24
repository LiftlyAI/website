import { query, queryOne } from '@/lib/db';
import type { AthleteProfile } from '@/lib/types';
import { estimatedOneRM } from '@/lib/calculations';
import { safeJsonParse } from '@/lib/utils';

export interface E1RMPoint {
  date: string;
  squat?: number;
  bench?: number;
  deadlift?: number;
  total?: number;
}
export interface BWPoint {
  date: string;
  bw: number;
  rolling7?: number;
}
export interface VolumePoint {
  week: string;
  squat: number;
  bench: number;
  deadlift: number;
}

export interface ProgressData {
  profile: AthleteProfile;
  e1rms: E1RMPoint[];
  bw: BWPoint[];
  volume: VolumePoint[];
}

/**
 * Shared progress query + shaping. The athlete-facing server component
 * (`(app)/progress/page.tsx`) AND the native GET endpoint (`api/v1/progress`)
 * both call this so the lift-history math lives in exactly one place.
 */
export async function getProgressData(athleteId: string): Promise<ProgressData> {
  const profile = safeJsonParse<AthleteProfile>(
    (await queryOne<{ profile_json: string }>('SELECT profile_json FROM athletes WHERE id = ?', [
      athleteId,
    ]))!.profile_json,
    {} as AthleteProfile,
  );

  const sessions = await query<{ date: string; exercises_json: string }>(
    'SELECT date, exercises_json FROM session_logs WHERE athlete_id = ? ORDER BY date ASC',
    [athleteId],
  );

  // e1RM time series (best e1RM per session per lift)
  const e1rms: E1RMPoint[] = sessions.map((s) => {
    const exs = safeJsonParse<{
      exercise: string;
      sets: { reps: number; weight: number }[];
    }[]>(s.exercises_json, []);
    const point: E1RMPoint = { date: s.date };
    for (const ex of exs) {
      const lower = ex.exercise.toLowerCase();
      let key: 'squat' | 'bench' | 'deadlift' | null = null;
      if (lower.includes('squat') && !lower.includes('pause') && !lower.includes('box') && !lower.includes('ssb'))
        key = 'squat';
      else if (lower.includes('bench') && !lower.includes('close') && !lower.includes('paused') && !lower.includes('incline'))
        key = 'bench';
      else if (lower.includes('deadlift') && !lower.includes('deficit') && !lower.includes('rack'))
        key = 'deadlift';
      if (!key) continue;
      for (const set of ex.sets) {
        const e = estimatedOneRM(set.weight, set.reps);
        if ((point[key] ?? 0) < e) point[key] = e;
      }
    }
    if (point.squat || point.bench || point.deadlift) {
      point.total = (point.squat ?? 0) + (point.bench ?? 0) + (point.deadlift ?? 0);
    }
    return point;
  });

  // Bodyweight + 7-day rolling
  const bwRows = await query<{ date: string; bodyweight: number }>(
    'SELECT date, bodyweight FROM bodyweight_logs WHERE athlete_id = ? ORDER BY date ASC',
    [athleteId],
  );
  const bw: BWPoint[] = bwRows.map((r, i) => {
    const window = bwRows.slice(Math.max(0, i - 6), i + 1);
    const rolling7 = window.reduce((s, x) => s + x.bodyweight, 0) / window.length;
    return { date: r.date, bw: r.bodyweight, rolling7: parseFloat(rolling7.toFixed(1)) };
  });

  // Volume per week per lift
  const volumeMap = new Map<string, VolumePoint>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const week = new Date(d);
    week.setDate(d.getDate() - d.getDay());
    const wk = week.toISOString().slice(0, 10);
    if (!volumeMap.has(wk)) volumeMap.set(wk, { week: wk, squat: 0, bench: 0, deadlift: 0 });
    const point = volumeMap.get(wk)!;
    const exs = safeJsonParse<{
      exercise: string;
      sets: { reps: number; weight: number }[];
    }[]>(s.exercises_json, []);
    for (const ex of exs) {
      const lower = ex.exercise.toLowerCase();
      let key: 'squat' | 'bench' | 'deadlift' | null = null;
      if (lower.includes('squat')) key = 'squat';
      else if (lower.includes('bench')) key = 'bench';
      else if (lower.includes('deadlift')) key = 'deadlift';
      if (!key) continue;
      for (const set of ex.sets) point[key] += set.weight * set.reps;
    }
  }
  const volume = Array.from(volumeMap.values()).sort((a, b) => a.week.localeCompare(b.week));

  return { profile, e1rms, bw, volume };
}
