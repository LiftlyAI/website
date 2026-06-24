import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Site-wide 404. Keeps the industrial design language and offers a way back.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-iron-950 px-4 py-12">
      <div className="chalk-card w-full max-w-md p-8 text-center">
        <div className="page-kicker mb-2">// 404</div>
        <h1 className="stencil-heading mb-3 text-4xl text-chalk">Plate not found</h1>
        <p className="mb-6 font-body text-sm text-chalk-mute">
          This page racked out. The link may be old or the page moved.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/">
            <Button>Back home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
