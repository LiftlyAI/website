'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-7 py-4 text-base',
};

const variants: Record<Variant, string> = {
  primary: 'bg-blood text-white shadow-glow-sm hover:bg-blood-glow hover:shadow-glow active:bg-blood-dim',
  ghost: 'bg-iron-900/60 text-chalk border border-iron-700 hover:border-blood/60 hover:bg-iron-800',
  danger: 'bg-rpe-max/15 text-rpe-max border border-rpe-max/40 hover:bg-rpe-max/25',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'btn-sheen inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg',
          'font-body font-semibold transition-all duration-150',
          'disabled:bg-iron-700 disabled:text-iron-400 disabled:cursor-not-allowed disabled:border-iron-700',
          sizes[size],
          variants[variant],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            …
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';
