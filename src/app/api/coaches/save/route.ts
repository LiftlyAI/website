import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { coachIdForUsername, saveCoach, unsaveCoach } from '@/lib/network-data';

const Body = z.object({ username: z.string().min(1) });

async function resolve(req: NextRequest) {
  const athlete = await requireSession();
  const data = await req.json().catch(() => null);
  const parsed = Body.safeParse(data);
  if (!parsed.success) return { error: 'invalid body' as const, status: 400 };
  const coachId = await coachIdForUsername(parsed.data.username);
  if (!coachId) return { error: 'coach not found' as const, status: 404 };
  return { athleteId: athlete.id, coachId };
}

export async function POST(req: NextRequest) {
  let r;
  try {
    r = await resolve(req);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  await saveCoach(r.athleteId, r.coachId);
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(req: NextRequest) {
  let r;
  try {
    r = await resolve(req);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  await unsaveCoach(r.athleteId, r.coachId);
  return NextResponse.json({ ok: true, saved: false });
}
