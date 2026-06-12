'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';

export default function CoachLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'login failed');
      router.push('/coach');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-iron-950">
      {/* Visual panel — aurora drift over an engineering grid (desktop only) */}
      <div className="auth-aurora grid-lines relative hidden flex-1 overflow-hidden border-r border-iron-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="text-chalk transition-colors hover:text-blood-glow">
          <LiftlyLogo size={32} />
        </Link>
        <div>
          <p className="page-kicker mb-4">// COACH CONSOLE</p>
          <p className="stencil-heading max-w-md text-4xl leading-tight text-chalk xl:text-5xl">
            Your whole roster, <span className="text-chalk-mute">one glance.</span>
          </p>
        </div>
        <p className="font-mono text-[11px] tracking-[0.25em] text-chalk-mute">
          THE AI DRAFTS · YOU APPROVE · NOTHING SHIPS WITHOUT SIGN-OFF
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.22), transparent 65%)' }}
        />
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-[520px] lg:shrink-0">
        <div className="stagger w-full max-w-md">
        <Link href="/" className="mb-10 block lg:hidden">
          <LiftlyLogo size={40} className="text-chalk" />
        </Link>

        <p className="page-kicker mb-2">// FOR COACHES</p>
        <h1 className="stencil-heading text-4xl text-chalk mb-2">Coach sign in</h1>
        <div className="accent-divider mb-6 max-w-[80px]" />
        <p className="text-sm text-chalk-mute mb-6 font-body">
          Enter your email to open the coach console. No password. Your email is your
          handle. Lifters sign in <Link href="/login" className="text-blood hover:text-blood-glow">here</Link>.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@example.com"
          />
          <Input
            label="Name (first time only)"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="optional, only used on first sign in"
          />
          {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
          <Button type="submit" loading={loading} className="w-full">
            Open the Console →
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}
