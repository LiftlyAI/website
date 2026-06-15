import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { listCoachesForAdmin, listCredentialQueue } from '@/lib/admin-data';
import { Card, CardHeader } from '@/components/ui/Card';
import { AdminActionButton } from './AdminActionButton';

export const dynamic = 'force-dynamic';

export default async function AdminVerificationPage() {
  const [coaches, credentials] = await Promise.all([
    listCoachesForAdmin(),
    listCredentialQueue(),
  ]);

  return (
    <div className="stagger space-y-8">
      <div>
        <div className="page-kicker mb-2">// TRUST</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Verification</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
      </div>

      <section className="space-y-3">
        <h2 className="stencil-heading text-lg text-chalk">
          Credential queue{credentials.length > 0 && ` (${credentials.length})`}
        </h2>
        {credentials.length === 0 ? (
          <div className="chalk-card p-6 text-center font-body text-sm text-chalk-mute">
            No pending credentials.
          </div>
        ) : (
          credentials.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-body text-sm text-chalk">
                    {c.title}
                    {c.issuer ? <span className="text-chalk-mute"> · {c.issuer}</span> : ''}
                  </div>
                  <div className="font-mono text-xs text-chalk-mute">
                    {c.coachUsername ? (
                      <Link href={`/coach/${c.coachUsername}`} className="hover:text-blood-glow">
                        {c.coachName ?? c.coachUsername}
                      </Link>
                    ) : (
                      c.coachName
                    )}
                    {c.documentUrl && (
                      <>
                        {' · '}
                        <a href={c.documentUrl} target="_blank" rel="noreferrer" className="hover:text-blood-glow">
                          document
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <AdminActionButton body={{ entity: 'credential', id: c.id, action: 'approved' }} label="Approve" />
                  <AdminActionButton body={{ entity: 'credential', id: c.id, action: 'rejected' }} label="Reject" variant="danger" />
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="stencil-heading text-lg text-chalk">Coaches</h2>
        <Card>
          <CardHeader title="Listed coaches" accent />
          <div className="divide-y divide-iron-800">
            {coaches.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {c.username ? (
                      <Link href={`/coach/${c.username}`} className="font-body text-sm text-chalk hover:text-blood-glow">
                        {c.name ?? c.email}
                      </Link>
                    ) : (
                      <span className="font-body text-sm text-chalk">{c.name ?? c.email}</span>
                    )}
                    {c.verified && <BadgeCheck className="h-4 w-4 text-blood-glow" />}
                    {c.banned && (
                      <span className="rounded bg-rpe-max/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-rpe-max">
                        banned
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-chalk-mute">
                    {c.email}
                    {c.pendingCredentials > 0 && (
                      <span className="text-rpe-mod"> · {c.pendingCredentials} pending creds</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <AdminActionButton
                    body={{ entity: 'coach-verify', id: c.id, value: !c.verified }}
                    label={c.verified ? 'Unverify' : 'Verify'}
                    variant={c.verified ? 'ghost' : 'primary'}
                  />
                  <AdminActionButton
                    body={{ entity: 'coach-ban', id: c.id, value: !c.banned }}
                    label={c.banned ? 'Unban' : 'Ban'}
                    variant="danger"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
