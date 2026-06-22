import { requireSession } from '@/lib/auth';
import { getProgressData } from '@/lib/progress';
import { ProgressView } from './ProgressView';

export default async function ProgressPage() {
  const session = await requireSession();
  const { profile, e1rms, bw, volume } = await getProgressData(session.id);

  return <ProgressView profile={profile} e1rms={e1rms} bw={bw} volume={volume} />;
}
