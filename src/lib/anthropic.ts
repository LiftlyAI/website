import Anthropic from '@anthropic-ai/sdk';

export const COACH_MODEL = 'claude-opus-4-7';

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local before calling AI features.',
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

// Strip markdown fences if Claude wraps JSON in ```json ... ```
export function unwrapJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return text.trim();
}

export function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(unwrapJson(text)) as T;
  } catch {
    return null;
  }
}
