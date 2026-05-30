// Provider-agnostic LLM layer. Switch between Gemini (default, cheap for
// testing) and Anthropic Claude via `LLM_PROVIDER` in .env.local. Routes
// import only from this file; the underlying SDK is an implementation
// detail. Adding a third provider is a single dispatch table change.

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

export type Provider = 'gemini' | 'anthropic';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface AiImage {
  mediaType: 'image/png' | 'image/jpeg';
  dataBase64: string;
}
export interface AiCallOptions {
  system?: string;
  messages: AiMessage[];
  images?: AiImage[]; // attached to the LAST user message
  maxTokens?: number;
  temperature?: number;
  /** When true, ask the provider to emit pure JSON (Gemini honours this via
   *  responseMimeType; Anthropic already relies on the system prompt). */
  json?: boolean;
}

const DEFAULTS: Record<Provider, { model: string }> = {
  gemini: { model: 'gemini-2.5-flash' },
  anthropic: { model: 'claude-opus-4-7' },
};

export function activeProvider(): Provider {
  const p = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (p === 'anthropic' || p === 'claude') return 'anthropic';
  return 'gemini';
}

export function coachModel(): string {
  return process.env.COACH_MODEL || DEFAULTS[activeProvider()].model;
}

// Kept for routes that import COACH_MODEL as a constant. Resolved at module
// load — fine for dev (server restart picks up env changes) and prod.
export const COACH_MODEL = coachModel();

// ---- Clients ----------------------------------------------------------

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local.');
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

let _gemini: GoogleGenAI | null = null;
function geminiClient(): GoogleGenAI {
  if (_gemini) return _gemini;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set — add it to .env.local.');
  _gemini = new GoogleGenAI({ apiKey });
  return _gemini;
}

// ---- Public surface ---------------------------------------------------

export async function aiGenerate(opts: AiCallOptions): Promise<string> {
  return activeProvider() === 'anthropic' ? anthropicGenerate(opts) : geminiGenerate(opts);
}

export async function* aiStream(opts: AiCallOptions): AsyncIterable<string> {
  if (activeProvider() === 'anthropic') {
    yield* anthropicStream(opts);
  } else {
    yield* geminiStream(opts);
  }
}

/** True if the AI call failed because no key is configured — distinguishes
 *  a 400 (user/operator fixable) from a 502 (provider down / quota). */
export function isAiKeyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /_API_KEY/i.test(msg);
}

// ---- Anthropic ---------------------------------------------------------

async function anthropicGenerate(opts: AiCallOptions): Promise<string> {
  const client = anthropicClient();
  const res = await client.messages.create({
    model: coachModel(),
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.5,
    system: opts.system,
    messages: anthropicMessages(opts),
  });
  return res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}

async function* anthropicStream(opts: AiCallOptions): AsyncIterable<string> {
  const client = anthropicClient();
  const stream = client.messages.stream({
    model: coachModel(),
    max_tokens: opts.maxTokens ?? 1500,
    temperature: opts.temperature ?? 0.5,
    system: opts.system,
    messages: anthropicMessages(opts),
  });
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
      yield ev.delta.text;
    }
  }
}

function anthropicMessages(opts: AiCallOptions): Anthropic.MessageParam[] {
  const last = opts.messages.length - 1;
  return opts.messages.map((m, i) => {
    if (i === last && m.role === 'user' && opts.images?.length) {
      const blocks: Array<
        | { type: 'text'; text: string }
        | {
            type: 'image';
            source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg'; data: string };
          }
      > = [{ type: 'text', text: m.content }];
      for (const im of opts.images) {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: im.mediaType, data: im.dataBase64 },
        });
      }
      return { role: 'user', content: blocks };
    }
    return { role: m.role, content: m.content };
  });
}

// ---- Gemini ------------------------------------------------------------

async function geminiGenerate(opts: AiCallOptions): Promise<string> {
  const client = geminiClient();
  const res = await client.models.generateContent({
    model: coachModel(),
    contents: geminiContents(opts),
    config: geminiConfig(opts, false),
  });
  return (res.text ?? '').trim();
}

async function* geminiStream(opts: AiCallOptions): AsyncIterable<string> {
  const client = geminiClient();
  const stream = await client.models.generateContentStream({
    model: coachModel(),
    contents: geminiContents(opts),
    config: geminiConfig(opts, true),
  });
  for await (const chunk of stream) {
    const t = chunk.text;
    if (t) yield t;
  }
}

function geminiConfig(opts: AiCallOptions, streaming: boolean) {
  // For pure-JSON tasks we (a) ask Gemini to emit application/json so we
  // never have to strip markdown fences or prose, and (b) skip "thinking"
  // tokens which add latency / cost without helping structured output.
  const base: Record<string, unknown> = {
    systemInstruction: opts.system,
    maxOutputTokens: opts.maxTokens ?? (streaming ? 1500 : 2000),
    temperature: opts.temperature ?? 0.5,
  };
  if (opts.json) {
    base.responseMimeType = 'application/json';
    base.thinkingConfig = { thinkingBudget: 0 };
  }
  return base;
}

function geminiContents(opts: AiCallOptions) {
  const last = opts.messages.length - 1;
  return opts.messages.map((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: m.content }];
    if (i === last && m.role === 'user' && opts.images?.length) {
      for (const im of opts.images) {
        parts.push({ inlineData: { mimeType: im.mediaType, data: im.dataBase64 } });
      }
    }
    return { role, parts };
  });
}

// ---- JSON helpers (used everywhere; kept here as a single import) -----

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
