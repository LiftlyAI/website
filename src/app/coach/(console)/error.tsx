'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Error boundary for the coach console — keeps a failed query from blanking the
// whole console.
export default function CoachConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="chalk-card w-full max-w-md p-8 text-center">
        <div className="page-kicker mb-2">// SOMETHING BROKE</div>
        <h1 className="stencil-heading mb-3 text-3xl text-chalk">Console error</h1>
        <p className="mb-6 font-body text-sm text-chalk-mute">
          We hit an error loading this view. Try again, or return to your triage board.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/coach">
            <Button variant="ghost">Triage</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
