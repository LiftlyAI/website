import { cn } from '@/lib/utils';
import { rpeColor } from '@/lib/calculations';

export function RPEBadge({ rpe, className }: { rpe: number; className?: string }) {
  const color = rpeColor(rpe);
  const colorMap: Record<string, string> = {
    'rpe-easy': 'bg-rpe-easy/20 text-rpe-easy border-rpe-easy/40',
    'rpe-mod': 'bg-rpe-mod/20 text-rpe-mod border-rpe-mod/40',
    'rpe-hard': 'bg-rpe-hard/20 text-rpe-hard border-rpe-hard/40',
    'rpe-max': 'bg-rpe-max/20 text-rpe-max border-rpe-max/40',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 border font-mono text-xs tabular-nums',
        colorMap[color],
        className,
      )}
    >
      <span className="opacity-60">RPE</span>
      <span className="font-bold">{rpe}</span>
    </span>
  );
}
