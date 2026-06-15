import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach } from '@/lib/coach-auth';
import { addCredential, deleteCredential } from '@/lib/network-data';

const Body = z.object({
  title: z.string().min(1).max(80),
  issuer: z.string().max(80).optional(),
  documentUrl: z.string().url().max(500).optional().or(z.literal('')),
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
  await addCredential(
    coach.id,
    parsed.data.title,
    parsed.data.issuer,
    parsed.data.documentUrl || undefined,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let coach;
  try {
    coach = await requireCoach();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  await deleteCredential(coach.id, parsed.data.id);
  return NextResponse.json({ ok: true });
}
