import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { coachIdForUsername, createApplication } from '@/lib/network-data';

const Body = z.object({
  username: z.string().min(1),
  payload: z.object({
    age: z.number().int().min(10).max(100).optional(),
    sex: z.enum(['male', 'female']).optional(),
    experience: z.enum(['novice', 'intermediate', 'advanced']).optional(),
    bodyweight: z.number().positive().optional(),
    unit: z.enum(['lbs', 'kg']).optional(),
    bestSquat: z.number().nonnegative().optional(),
    bestBench: z.number().nonnegative().optional(),
    bestDeadlift: z.number().nonnegative().optional(),
    meetHistory: z.string().max(2000).optional(),
    goals: z.string().max(2000).optional(),
    timeline: z.string().max(500).optional(),
    injuries: z.string().max(2000).optional(),
    availability: z.string().max(500).optional(),
  }),
});

export async function POST(req: NextRequest) {
  let athlete;
  try {
    athlete = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await req.json().catch(() => null);
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const coachId = await coachIdForUsername(parsed.data.username);
  if (!coachId) {
    return NextResponse.json({ error: 'coach not found' }, { status: 404 });
  }

  await createApplication(coachId, athlete.id, parsed.data.payload);
  return NextResponse.json({ ok: true });
}
