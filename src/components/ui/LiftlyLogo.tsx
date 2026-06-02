import { cn } from '@/lib/utils';

type LiftlyLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

export function LiftlyLogo({ size = 32, showWordmark = true, className }: LiftlyLogoProps) {
  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{ gap: size * 0.35, color: 'currentColor' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
        style={{ flex: '0 0 auto' }}
      >
        <polygon
          points="55,12 145,12 192,100 145,188 55,188 8,100"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 72 56 L 102 56 L 102 118 L 130 118 L 130 108 L 148 108 L 148 146 L 130 146 L 130 142 L 72 142 Z"
          fill="currentColor"
          transform="skewX(-6) translate(7 0)"
        />
      </svg>
      {showWordmark && (
        <span
          className="font-black tracking-tight leading-none"
          style={{
            fontSize: size * 0.92,
            fontFamily: 'var(--font-body), Inter, system-ui, sans-serif',
            letterSpacing: '-0.025em',
          }}
        >
          Liftly
        </span>
      )}
    </span>
  );
}
