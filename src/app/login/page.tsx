'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        });
        if (signUpError) throw new Error(signUpError.message);
        setMessage('Check your email and click the verification link to activate your account.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error(signInError.message);
        const res = await fetch('/api/auth/status');
        const { hasProfile } = await res.json();
        router.push(hasProfile ? '/dashboard' : '/onboarding');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
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

        <h1 className="stencil-heading text-3xl text-chalk mb-2">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <div className="accent-divider mb-6 max-w-[80px]" />
        <p className="text-sm text-chalk-mute mb-6 font-body">
          {mode === 'signin'
            ? 'Sign in to your account to continue training.'
            : 'Create an account to start your program.'}{' '}
          Coaching a roster?{' '}
          <Link href="/coach/login" className="text-blood hover:text-blood-glow">
            Coach sign in →
          </Link>
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lifter@example.com"
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {mode === 'signup' && (
            <Input
              label="Confirm password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          )}
          {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
          {message && <div className="text-sm text-chalk font-mono">{message}</div>}
          <Button type="submit" loading={loading} className="w-full">
            {mode === 'signin' ? 'Enter the Platform →' : 'Create Account →'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-chalk-mute font-body text-center">
          {mode === 'signin' ? (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                className="text-chalk underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                className="text-chalk underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
