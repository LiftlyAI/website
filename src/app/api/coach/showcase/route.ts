import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach } from '@/lib/coach-auth';
import { replaceShowcase } from '@/lib/network-data';

const resultData = z.object({
  title: z.string().min(1).max(120),
  athleteName: z.string().max(80).optional(),
  lift: z.string().max(40).optional(),
  beforeValue: z.number().optional(),
  afterValue: z.number().optional(),
  unit: z.enum(['lbs', 'kg']).optional(),
  timeframe: z.string().max(60).optional(),
  detail: z.string().max(500).optional(),
});

const athleteData = z.object({
  name: z.string().min(1).max(80),
  weightClass: z.string().max(30).optional(),
  bestSquat: z.number().optional(),
  bestBench: z.number().optional(),
  bestDeadlift: z.number().optional(),
  unit: z.enum(['lbs', 'kg']).optional(),
  meetResult: z.string().max(120).optional(),
  photoUrl: z.string().url().max(500).optional().or(z.literal('')),
});

const Body = z.object({
  items: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('result'), data: resultData }),
        z.object({ type: z.literal('athlete'), data: athleteData }),
      ]),
    )
    .max(24),
});

export async function POST(req: NextRequest) {
  let coach;
  try {
    coach = await requireCoach();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  await replaceShowcase(coach.id, parsed.data.items);
  return NextResponse.json({ ok: true });
}
