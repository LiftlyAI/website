import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateCoach, setCoachSession } from '@/lib/coach-auth';

const Body = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null);
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }
  const coach = getOrCreateCoach(parsed.data.email, parsed.data.name);
  await setCoachSession(coach.id);
  return NextResponse.json({ id: coach.id, email: coach.email, name: coach.name });
}
