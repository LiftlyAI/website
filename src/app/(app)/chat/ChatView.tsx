'use client';
import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

const QUICK = [
  'My squat felt too easy today',
  "I'm feeling beaten up",
  'What should I eat before my session?',
  'Adjust this week\'s weights',
];

export function ChatView({
  initialMessages,
  athleteName,
}: {
  initialMessages: ChatMessage[];
  athleteName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const optimistic: ChatMessage = {
      id: 'tmp-' + Date.now(),
      athleteId: '',
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput('');
    setStreaming(true);

    const assistantId = 'asst-' + Date.now();
    setMessages((m) => [
      ...m,
      { id: assistantId, athleteId: '', role: 'assistant', content: '', createdAt: Date.now() },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'chat failed');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)),
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'failed';
      setMessages((m) =>
        m.map((x) =>
          x.id === assistantId
            ? { ...x, content: '⚠ ' + msg }
            : x,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] lg:h-screen">
      <div className="border-b border-iron-800 px-4 sm:px-8 py-4">
        <div className="font-mono text-xs text-chalk-mute tracking-widest">YOUR COACH</div>
        <div className="stencil-heading text-2xl text-chalk leading-none">
          ASK ANYTHING<span className="text-blood">.</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        {messages.length === 0 && (
          <div className="max-w-md mx-auto text-center mt-12">
            <p className="text-sm text-chalk-mute mb-6">
              Hey {athleteName?.split(' ')[0] ?? 'lifter'}. Tell me how you're feeling, ask about
              the program, or send a question.
            </p>
            <div className="flex flex-col gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="border border-iron-700 hover:border-blood text-sm px-4 py-2 text-chalk-dim hover:text-chalk transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-5 max-w-3xl mx-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  m.role === 'user'
                    ? 'bg-blood text-iron-950 px-4 py-3 max-w-[80%] whitespace-pre-wrap'
                    : 'bg-iron-900 border border-iron-800 text-chalk px-4 py-3 max-w-[80%] whitespace-pre-wrap'
                }
              >
                {m.role === 'assistant' && (
                  <div className="font-mono text-[10px] tracking-widest text-blood mb-1">
                    COACH
                  </div>
                )}
                <div className="text-sm leading-relaxed">{m.content || '…'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-iron-800 px-4 sm:px-8 py-4"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to your coach…"
            disabled={streaming}
            className="input-iron"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="btn-primary px-5 disabled:bg-iron-700 disabled:text-iron-400"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
