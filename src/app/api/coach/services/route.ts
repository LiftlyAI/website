import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach } from '@/lib/coach-auth';
import { replaceServices } from '@/lib/network-data';

const Body = z.object({
  services: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(1000).optional(),
        price: z.number().nonnegative().nullable().optional(),
        cadence: z.enum(['month', 'one-time', 'session']),
        features: z.array(z.string().max(120)).max(20).optional(),
      }),
    )
    .max(10),
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
  await replaceServices(coach.id, parsed.data.services);
  return NextResponse.json({ ok: true });
}
