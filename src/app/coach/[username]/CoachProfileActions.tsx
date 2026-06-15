'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ApplyForCoachingModal } from './ApplyForCoachingModal';

export function CoachProfileActions({
  username,
  coachName,
  isLoggedIn,
  isCoachViewer,
  initialSaved,
  initialFollowing,
}: {
  username: string;
  coachName: string;
  isLoggedIn: boolean;
  isCoachViewer: boolean;
  initialSaved: boolean;
  initialFollowing: boolean;
}) {
  const [showApply, setShowApply] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [savePending, setSavePending] = useState(false);
  const [following, setFollowing] = useState(initialFollowing);
  const [followPending, setFollowPending] = useState(false);

  // A coach viewing a profile (or an anonymous visitor) can't apply/save as an
  // athlete — funnel them to athlete login.
  const loginHref = `/login?redirect=/coach/${username}`;

  if (!isLoggedIn || isCoachViewer) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href={loginHref}>
          <Button>Apply for coaching</Button>
        </Link>
        <Link href={loginHref}>
          <Button variant="ghost">
            <UserPlus className="h-4 w-4" /> Follow
          </Button>
        </Link>
        <Link href={loginHref}>
          <Button variant="ghost">
            <Bookmark className="h-4 w-4" /> Save
          </Button>
        </Link>
      </div>
    );
  }

  async function toggleSave() {
    setSavePending(true);
    try {
      const res = await fetch('/api/coaches/save', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) setSaved(!saved);
    } finally {
      setSavePending(false);
    }
  }

  async function toggleFollow() {
    setFollowPending(true);
    try {
      const res = await fetch('/api/coaches/follow', {
        method: following ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) setFollowing(!following);
    } finally {
      setFollowPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowApply(true)}>Apply for coaching</Button>
        <Button variant="ghost" onClick={toggleFollow} loading={followPending}>
          {following ? (
            <>
              <UserCheck className="h-4 w-4 text-blood-glow" /> Following
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Follow
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={toggleSave} loading={savePending}>
          {saved ? (
            <>
              <BookmarkCheck className={cn('h-4 w-4 text-blood-glow')} /> Saved
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" /> Save
            </>
          )}
        </Button>
      </div>
      {showApply && (
        <ApplyForCoachingModal
          username={username}
          coachName={coachName}
          onClose={() => setShowApply(false)}
        />
      )}
    </>
  );
}
