'use client';

import { usePathname } from 'next/navigation';

/**
 * Re-keys its subtree on every route change so the .page-enter rise-in
 * animation replays, giving the whole app soft page transitions.
 * Reduced motion neutralizes the animation globally in globals.css.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
