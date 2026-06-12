'use client';

import { useRef, useEffect, useState } from 'react';

const GLYPHS = '▮▯/\\|_◆□■<>+×─01';

/**
 * Decodes its text with a glyph-scramble once scrolled into view.
 * Falls back to plain text under reduced motion.
 */
export function ScrambleText({
  text,
  className,
  speed = 35,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        let step = 0;
        const totalSteps = text.length + 6;
        interval = setInterval(() => {
          step++;
          const resolved = Math.max(0, step - 6);
          setDisplay(
            text
              .split('')
              .map((char, i) => {
                if (char === ' ' || i < resolved) return char;
                return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              })
              .join('')
          );
          if (step >= totalSteps) {
            clearInterval(interval);
            setDisplay(text);
          }
        }, speed);
      },
      { threshold: 0.6 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [text, speed]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {display}
    </span>
  );
}
