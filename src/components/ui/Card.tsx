import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('chalk-card p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  accent = false,
}: {
  title: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="stencil-heading text-xl text-chalk">{title}</h3>
        {subtitle && <span className="text-xs font-mono text-chalk-mute">{subtitle}</span>}
      </div>
      {accent && <div className="accent-divider mt-2" />}
    </div>
  );
}
