'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { SPECIALTIES, FEDERATIONS } from '@/lib/network-constants';
import type { CoachProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ProfileEditor({
  initialUsername,
  initialProfile,
  initialListed,
}: {
  initialUsername: string | null;
  initialProfile: CoachProfile;
  initialListed: boolean;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? '');
  const [listed, setListed] = useState(initialListed);
  const [p, setP] = useState<CoachProfile>(initialProfile);
  const [credentialsText, setCredentialsText] = useState((initialProfile.credentials ?? []).join(', '));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof CoachProfile>(k: K, v: CoachProfile[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  function toggleArr(k: 'specialties' | 'federations', value: string) {
    const cur = p[k] ?? [];
    set(k, cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]);
  }

  async function save() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const profile: CoachProfile = {
      ...p,
      credentials: credentialsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      const res = await fetch('/api/coach/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), listed, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setSaved(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Listing" subtitle="how athletes find you" accent />
        <div className="space-y-4">
          <Input
            label="Username (your public URL)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            hint="lowercase letters, numbers, hyphens · liftly.com/coach/your-name"
            placeholder="josh-bryant"
          />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={listed}
              onChange={(e) => {
                setListed(e.target.checked);
                setSaved(false);
              }}
              className="h-4 w-4 accent-blood"
            />
            <span className="font-body text-sm text-chalk">
              List my profile publicly in the Coaches Network
            </span>
          </label>
          {initialUsername && listed && (
            <Link
              href={`/coach/${initialUsername}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-blood-glow hover:underline"
            >
              View public profile <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Profile" accent />
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Display name" value={p.displayName ?? ''} onChange={(e) => set('displayName', e.target.value)} />
            <Input label="Location" value={p.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="Austin, TX" />
          </div>
          <Input label="Tagline" value={p.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} placeholder="National-level raw coach · 12 IPF qualifiers" />
          <Textarea label="Bio" rows={5} value={p.bio ?? ''} onChange={(e) => set('bio', e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Years coaching"
              type="number"
              value={p.experienceYears != null ? String(p.experienceYears) : ''}
              onChange={(e) => set('experienceYears', e.target.value ? Number(e.target.value) : undefined)}
            />
            <Select
              label="Availability"
              value={p.availability ?? 'accepting'}
              onChange={(e) => set('availability', e.target.value as CoachProfile['availability'])}
              options={[
                { value: 'accepting', label: 'Accepting clients' },
                { value: 'waitlist', label: 'Waitlist' },
                { value: 'full', label: 'Full' },
              ]}
            />
            <Input label="Response time" value={p.responseTime ?? ''} onChange={(e) => set('responseTime', e.target.value)} placeholder="within 24h" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!p.online} onChange={(e) => set('online', e.target.checked)} className="h-4 w-4 accent-blood" />
              <span className="font-body text-sm text-chalk">Online</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!p.inPerson} onChange={(e) => set('inPerson', e.target.checked)} className="h-4 w-4 accent-blood" />
              <span className="font-body text-sm text-chalk">In-person</span>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Profile photo URL" value={p.photoUrl ?? ''} onChange={(e) => set('photoUrl', e.target.value)} placeholder="https://…" />
            <Input label="Banner image URL" value={p.bannerUrl ?? ''} onChange={(e) => set('bannerUrl', e.target.value)} placeholder="https://…" />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Specialties" accent />
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => {
            const on = p.specialties?.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => toggleArr('specialties', s.slug)}
                className={cn(
                  'rounded-full border px-3 py-1.5 font-body text-xs transition-all',
                  on
                    ? 'border-blood/60 bg-blood/15 text-chalk'
                    : 'border-iron-700 bg-iron-900/60 text-chalk-dim hover:text-chalk',
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Federations" accent />
        <div className="flex flex-wrap gap-2">
          {FEDERATIONS.map((f) => {
            const on = p.federations?.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleArr('federations', f)}
                className={cn(
                  'rounded-full border px-3 py-1.5 font-mono text-xs transition-all',
                  on
                    ? 'border-blood/60 bg-blood/15 text-chalk'
                    : 'border-iron-700 bg-iron-900/60 text-chalk-dim hover:text-chalk',
                )}
              >
                {f}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Credentials" subtitle="comma-separated" accent />
        <Input
          value={credentialsText}
          onChange={(e) => {
            setCredentialsText(e.target.value);
            setSaved(false);
          }}
          placeholder="CSCS, USAW, Exercise Science Degree"
        />
      </Card>

      {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
      {saved && <div className="font-mono text-sm text-rpe-easy">Saved.</div>}
      <Button onClick={save} loading={loading} size="lg">
        Save profile
      </Button>
    </div>
  );
}
