import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach } from '@/lib/coach-auth';
import { getApplication, resolveApplication } from '@/lib/network-data';

const Body = z.object({
  id: z.string().min(1),
  action: z.enum(['accepted', 'rejected', 'waitlisted']),
  note: z.string().max(2000).optional(),
});

export async function PATCH(req: NextRequest) {
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

  const application = await getApplication(parsed.data.id);
  if (!application) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // Ownership: a coach can only act on applications addressed to them.
  if (application.coachId !== coach.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await resolveApplication(application, parsed.data.action, parsed.data.note);
  return NextResponse.json({ ok: true });
}
