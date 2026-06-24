'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Catches render/data errors anywhere in the authenticated app so a single bad
// DB row or failed query shows a recoverable card instead of a white screen.
export default function AppError({
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
        <h1 className="stencil-heading mb-3 text-3xl text-chalk">Lift failed</h1>
        <p className="mb-6 font-body text-sm text-chalk-mute">
          We hit an error loading this page. Your data is safe — try again, or head back to the
          dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
