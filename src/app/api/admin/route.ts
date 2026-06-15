import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import {
  setCredentialStatus,
  setCoachVerified,
  setCoachBanned,
  setReviewHidden,
} from '@/lib/admin-data';
import { resolveReport } from '@/lib/network-data';

// One endpoint for every admin moderation action, discriminated by `entity`.
const Body = z.discriminatedUnion('entity', [
  z.object({ entity: z.literal('credential'), id: z.string().min(1), action: z.enum(['approved', 'rejected']) }),
  z.object({ entity: z.literal('coach-verify'), id: z.string().min(1), value: z.boolean() }),
  z.object({ entity: z.literal('coach-ban'), id: z.string().min(1), value: z.boolean() }),
  z.object({ entity: z.literal('review'), id: z.string().min(1), hidden: z.boolean() }),
  z.object({ entity: z.literal('report'), id: z.string().min(1), action: z.enum(['resolved', 'dismissed']) }),
]);

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const b = parsed.data;

  switch (b.entity) {
    case 'credential':
      await setCredentialStatus(b.id, b.action);
      break;
    case 'coach-verify':
      await setCoachVerified(b.id, b.value);
      break;
    case 'coach-ban':
      await setCoachBanned(b.id, b.value);
      break;
    case 'review':
      await setReviewHidden(b.id, b.hidden);
      break;
    case 'report':
      await resolveReport(b.id, b.action);
      break;
  }
  return NextResponse.json({ ok: true });
}
