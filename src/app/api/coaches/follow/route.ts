import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { coachIdForUsername, followCoach, unfollowCoach } from '@/lib/network-data';

const Body = z.object({ username: z.string().min(1) });

async function resolve(req: NextRequest) {
  const athlete = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => null));
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
  await followCoach(r.athleteId, r.coachId);
  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(req: NextRequest) {
  let r;
  try {
    r = await resolve(req);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  await unfollowCoach(r.athleteId, r.coachId);
  return NextResponse.json({ ok: true, following: false });
}
