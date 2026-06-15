import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import {
  athleteHasRelationship,
  coachIdForUsername,
  createReview,
} from '@/lib/network-data';

const score = z.number().int().min(1).max(5);
const Body = z.object({
  username: z.string().min(1),
  rating: score,
  communication: score.optional(),
  programming: score.optional(),
  meetPrep: score.optional(),
  responsiveness: score.optional(),
  body: z.string().max(2000).optional(),
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

  // Verified-athlete gate: must have a real relationship with this coach.
  if (!(await athleteHasRelationship(coachId, athlete.id))) {
    return NextResponse.json(
      { error: 'Only athletes coached by this coach can leave a review.' },
      { status: 403 },
    );
  }

  const { rating, communication, programming, meetPrep, responsiveness, body } = parsed.data;
  await createReview(coachId, athlete.id, {
    rating,
    communication,
    programming,
    meetPrep,
    responsiveness,
    body,
  });
  return NextResponse.json({ ok: true });
}
