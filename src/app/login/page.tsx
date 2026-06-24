'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function signInWithGoogle() {
    setOauthLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (oauthError) throw new Error(oauthError.message);
      // On success the browser is redirected to Google's consent screen, so we
      // leave oauthLoading on — this page is unmounting. Only reset it on error.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in.');
      setOauthLoading(false);
    }
  }

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
        // Sign-in succeeded. Route by whether they've onboarded; if the status
        // check fails for any reason, fall back to the dashboard rather than
        // surfacing a scary error on a successful login.
        let hasProfile = true;
        try {
          const res = await fetch('/api/auth/status');
          if (res.ok) ({ hasProfile } = await res.json());
        } catch {
          /* keep default — dashboard will handle a missing profile */
        }
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
    <div className="flex min-h-screen bg-iron-950">
      {/* Visual panel — aurora drift over an engineering grid (desktop only) */}
      <div className="auth-aurora grid-lines relative hidden flex-1 overflow-hidden border-r border-iron-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="text-chalk transition-colors hover:text-blood-glow">
          <LiftlyLogo size={32} />
        </Link>
        <div>
          <p className="page-kicker mb-4">// THE PLATFORM</p>
          <p className="stencil-heading max-w-md text-4xl leading-tight text-chalk xl:text-5xl">
            Every number on the bar,{' '}
            <span className="text-chalk-mute">earned and accounted for.</span>
          </p>
        </div>
        <p className="font-mono text-[11px] tracking-[0.25em] text-chalk-mute">
          NO FLUFF · NO PUSH NOTIFICATIONS · BUILT FOR THE PLATFORM
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

        <p className="page-kicker mb-2">// {mode === 'signin' ? 'WELCOME BACK' : 'JOIN THE PLATFORM'}</p>
        <h1 className="stencil-heading text-4xl text-chalk mb-2">
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

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={oauthLoading || loading}
          className="btn-sheen mb-5 inline-flex min-h-[44px] w-full items-center justify-center gap-3 rounded-lg bg-chalk px-5 py-3 font-body text-sm font-semibold text-iron-950 transition-all duration-150 hover:bg-white disabled:cursor-not-allowed disabled:bg-iron-700 disabled:text-iron-400"
        >
          {oauthLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          Continue with Google
        </button>

        <div className="mb-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-iron-800" />
          <span className="font-mono text-[11px] tracking-[0.25em] text-chalk-mute">OR</span>
          <div className="h-px flex-1 bg-iron-800" />
        </div>

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
    </div>
  );
}
