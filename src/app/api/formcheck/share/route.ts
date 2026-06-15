import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { setFormCheckShared } from '@/lib/form-review-data';

const Body = z.object({ formCheckId: z.string().min(1), shared: z.boolean() });

export async function POST(req: NextRequest) {
  let athlete;
  try {
    athlete = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const ok = await setFormCheckShared(athlete.id, parsed.data.formCheckId, parsed.data.shared);
  if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, shared: parsed.data.shared });
}
