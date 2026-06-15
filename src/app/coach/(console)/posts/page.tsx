import { redirect } from 'next/navigation';
import { getCoachSession } from '@/lib/coach-auth';
import { listPosts } from '@/lib/network-data';
import { PostsManager } from './PostsManager';

export const dynamic = 'force-dynamic';

export default async function CoachPostsPage() {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  const posts = await listPosts(coach.id, 30);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// CONTENT</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Posts</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="max-w-2xl font-body text-sm text-chalk-mute">
          Publish training advice, meet recaps and spotlights. Athletes who follow you see these in
          their feed — content builds your audience before they ever apply.
        </p>
      </div>
      <PostsManager initial={posts} />
    </div>
  );
}
