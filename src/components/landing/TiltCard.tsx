'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';

/**
 * 3D perspective tilt on hover with a glare highlight that tracks the
 * cursor. Inert on touch devices and under reduced motion.
 */
export function TiltCard({
  children,
  className,
  maxTilt = 7,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const glare = glareRef.current;
    if (!el || !glare) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    const rxTo = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ryTo = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    gsap.set(el, { transformPerspective: 900 });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      rxTo((0.5 - py) * maxTilt * 2);
      ryTo((px - 0.5) * maxTilt * 2);
      gsap.to(glare, {
        opacity: 1,
        x: (px - 0.5) * rect.width * 0.6,
        y: (py - 0.5) * rect.height * 0.6,
        duration: 0.4,
        ease: 'power2.out',
      });
    };
    const onLeave = () => {
      rxTo(0);
      ryTo(0);
      gsap.to(glare, { opacity: 0, duration: 0.5 });
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [maxTilt]);

  return (
    <div ref={ref} className={className} style={{ transformStyle: 'preserve-3d' }}>
      <div
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{
          background:
            'radial-gradient(420px circle at center, rgba(96,165,250,0.13), transparent 65%)',
        }}
      />
      {children}
    </div>
  );
}
