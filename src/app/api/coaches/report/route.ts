import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { coachIdForUsername, createReport } from '@/lib/network-data';

const Body = z.object({
  targetType: z.enum(['coach', 'review']),
  // For a coach report, pass the username; for a review, pass the review id.
  username: z.string().optional(),
  reviewId: z.string().optional(),
  reason: z.string().min(3).max(2000),
});

export async function POST(req: NextRequest) {
  let athlete;
  try {
    athlete = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  let targetId: string | null = null;
  if (parsed.data.targetType === 'coach') {
    targetId = parsed.data.username ? await coachIdForUsername(parsed.data.username) : null;
  } else {
    targetId = parsed.data.reviewId ?? null;
  }
  if (!targetId) return NextResponse.json({ error: 'target not found' }, { status: 404 });

  await createReport(athlete.id, 'athlete', parsed.data.targetType, targetId, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
