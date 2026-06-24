'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Error boundary for the admin area.
export default function AdminError({
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
        <h1 className="stencil-heading mb-3 text-3xl text-chalk">Admin error</h1>
        <p className="mb-6 font-body text-sm text-chalk-mute">
          We hit an error loading this view. Try again, or return to the admin home.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/admin">
            <Button variant="ghost">Admin home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
