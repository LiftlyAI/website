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
  primary: 'bg-blood text-iron-950 hover:bg-blood-glow',
  ghost: 'bg-transparent text-chalk border border-iron-600 hover:border-blood hover:bg-iron-800',
  danger: 'bg-rpe-max text-iron-950 hover:bg-red-400',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'font-display uppercase tracking-widest transition-colors duration-150',
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
