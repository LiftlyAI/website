import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import type { ChatMessage } from '@/lib/types';
import { ChatView } from './ChatView';

export default async function ChatPage() {
  const session = await requireSession();
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT id, role, content, created_at FROM chat_messages WHERE athlete_id = ? ORDER BY created_at ASC LIMIT 200',
    )
    .all(session.id) as { id: string; role: string; content: string; created_at: number }[];

  const messages: ChatMessage[] = rows.map((r) => ({
    id: r.id,
    athleteId: session.id,
    role: r.role as 'user' | 'assistant',
    content: r.content,
    createdAt: r.created_at,
  }));

  return <ChatView initialMessages={messages} athleteName={session.name ?? ''} />;
}
