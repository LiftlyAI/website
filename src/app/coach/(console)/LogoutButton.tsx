'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function CoachLogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch('/api/coach/auth/logout', { method: 'POST' });
        router.push('/coach/login');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
