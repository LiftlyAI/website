import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Response depends on the per-request auth cookie — never prerender or cache it.
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ hasProfile: session?.hasProfile ?? false });
}
