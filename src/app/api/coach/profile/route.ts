import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach } from '@/lib/coach-auth';
import { updateCoachProfile } from '@/lib/network-data';

const Body = z.object({
  username: z.string().min(3).max(32),
  listed: z.boolean(),
  profile: z.object({
    displayName: z.string().max(80).optional(),
    tagline: z.string().max(160).optional(),
    bio: z.string().max(4000).optional(),
    location: z.string().max(120).optional(),
    specialties: z.array(z.string().max(40)).max(20).optional(),
    federations: z.array(z.string().max(40)).max(20).optional(),
    credentials: z.array(z.string().max(60)).max(20).optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    online: z.boolean().optional(),
    inPerson: z.boolean().optional(),
    availability: z.enum(['accepting', 'waitlist', 'full']).optional(),
    responseTime: z.string().max(60).optional(),
    photoUrl: z.string().url().max(500).optional().or(z.literal('')),
    bannerUrl: z.string().url().max(500).optional().or(z.literal('')),
  }),
});

export async function POST(req: NextRequest) {
  let coach;
  try {
    coach = await requireCoach();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await req.json().catch(() => null);
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  // Drop empty-string image URLs so they don't persist as ''.
  const profile = { ...parsed.data.profile };
  if (!profile.photoUrl) delete profile.photoUrl;
  if (!profile.bannerUrl) delete profile.bannerUrl;

  const result = await updateCoachProfile(
    coach.id,
    profile,
    parsed.data.username,
    parsed.data.listed,
  );
  if (!result.ok) {
    const msg =
      result.error === 'username-taken'
        ? 'That username is already taken.'
        : 'Username must be 3-32 chars, lowercase letters, numbers or hyphens, and not reserved.';
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
