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
    <div className="min-h-screen flex items-center justify-center px-6 bg-iron-950">
      <div className="w-full max-w-md">
        <Link href="/" className="block mb-10">
          <LiftlyLogo size={40} className="text-chalk" />
        </Link>

        <h1 className="stencil-heading text-3xl text-chalk mb-2">Coach sign in</h1>
        <div className="accent-divider mb-6 max-w-[80px]" />
        <p className="text-sm text-chalk-mute mb-6 font-body">
          Enter your email to open the coach console. No password — your email is your
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
            placeholder="optional — only used on first sign in"
          />
          {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
          <Button type="submit" loading={loading} className="w-full">
            Open the Console →
          </Button>
        </form>
      </div>
    </div>
  );
}
