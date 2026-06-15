import { listReports } from '@/lib/network-data';
import { Card } from '@/components/ui/Card';
import { AdminActionButton } from '../AdminActionButton';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const reports = await listReports('open');

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// MODERATION</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Reports</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="font-body text-sm text-chalk-mute">
          Open reports against coaches and reviews. Resolve once handled (use the Verification and
          Reviews tabs to ban a coach or hide a review).
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="chalk-card p-6 text-center font-body text-sm text-chalk-mute">
          No open reports.
        </div>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs uppercase tracking-wide text-chalk-mute">
                  {r.targetType} · {new Date(r.createdAt).toLocaleDateString()}
                </div>
                <p className="mt-1 font-body text-sm text-chalk-dim">{r.reason}</p>
                <div className="mt-1 font-mono text-[11px] text-chalk-mute">
                  target id: {r.targetId}
                </div>
              </div>
              <div className="flex gap-2">
                <AdminActionButton body={{ entity: 'report', id: r.id, action: 'resolved' }} label="Resolve" />
                <AdminActionButton body={{ entity: 'report', id: r.id, action: 'dismissed' }} label="Dismiss" variant="ghost" />
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
