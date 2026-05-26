import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateAthlete, setSession } from '@/lib/auth';

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
  const athlete = getOrCreateAthlete(parsed.data.email, parsed.data.name);
  await setSession(athlete.id);
  return NextResponse.json({
    id: athlete.id,
    email: athlete.email,
    hasProfile: athlete.hasProfile,
  });
}
