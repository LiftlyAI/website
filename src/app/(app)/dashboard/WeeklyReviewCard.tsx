import { CalendarCheck, Wrench, AlertTriangle, Lightbulb, Info } from 'lucide-react';
import { cn, fmtDate } from '@/lib/utils';
import type { DecisionFinding, PlannedActual, WeeklyReview } from '@/lib/types';

const SEV: Record<DecisionFinding['severity'], { text: string; border: string; Icon: typeof Info }> = {
  caution: { text: 'text-rpe-max', border: 'border-rpe-max/50', Icon: AlertTriangle },
  suggest: { text: 'text-rpe-mod', border: 'border-rpe-mod/50', Icon: Lightbulb },
  info: { text: 'text-chalk-mute', border: 'border-iron-700', Icon: Info },
};

export function WeeklyReviewCard({ review }: { review: WeeklyReview }) {
  return (
    <div className="chalk-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-blood" />
          <span className="stencil-heading text-xl text-chalk">Weekly Review</span>
        </div>
        <span className="font-mono text-[10px] tracking-widest text-chalk-mute">
          {review.blockName ? `${review.blockName.toUpperCase()} · ` : ''}WEEK OF {fmtDate(review.weekStart)}
        </span>
      </div>

      {/* Planned vs actual */}
      <div className="border border-iron-800">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-2 border-b border-iron-800 font-mono text-[10px] tracking-widest text-chalk-mute">
          <span>METRIC</span>
          <span className="text-right">PLANNED</span>
          <span className="text-right">ACTUAL</span>
        </div>
        <PARow row={review.sessions} />
        {review.rows.map((r, i) => (
          <PARow key={i} row={r} />
        ))}
      </div>

      {/* Findings */}
      {review.findings.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="stencil-heading text-[10px] tracking-widest text-chalk-mute">WHAT THE LOOP NOTICED</div>
          {review.findings.map((f, i) => {
            const s = SEV[f.severity];
            return (
              <div key={i} className={cn('border-l-2 pl-3', s.border)}>
                <div className={cn('text-sm flex items-center gap-1.5', s.text)}>
                  <s.Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-chalk">{f.title}</span>
                </div>
                <p className="text-[12px] text-chalk-mute mt-0.5 font-body">{f.detail}</p>
                <p className="text-[12px] text-chalk mt-1 font-body">→ {f.action}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* The Sunday tweak — the single change for next week */}
      <div className="mt-4 border border-blood/40 bg-blood/5 p-3">
        <div className="stencil-heading text-[10px] tracking-widest text-blood mb-1 inline-flex items-center gap-1">
          <Wrench className="w-3 h-3" /> THE SUNDAY TWEAK
        </div>
        <p className="text-sm text-chalk font-body">{review.sundayTweak}</p>
      </div>
    </div>
  );
}

function PARow({ row }: { row: PlannedActual }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-2 border-b border-iron-800 last:border-b-0 items-baseline">
      <span className="text-sm text-chalk">{row.label}</span>
      <span className="font-mono text-sm text-chalk-mute text-right">{row.planned}</span>
      <span className={cn('font-mono text-sm text-right', row.onTrack ? 'text-rpe-easy' : 'text-rpe-mod')}>
        {row.actual}
      </span>
    </div>
  );
}
