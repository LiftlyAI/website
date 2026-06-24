import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(weight: number, unit: 'lbs' | 'kg' = 'lbs'): string {
  return `${Math.round(weight)} ${unit}`;
}

// Parse JSON that comes from the DB (or any untrusted source) without letting a
// single malformed row throw and take down the whole server-rendered page.
// Returns `fallback` when the input is missing or fails to parse.
export function safeJsonParse<T>(input: string | null | undefined, fallback: T): T {
  if (input == null) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

// fetch wrapper that aborts after `timeoutMs` so a hung AI request (program /
// nutrition / form-check generation can take 30-90s) surfaces a friendly,
// retryable message instead of leaving a spinner running forever.
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 120_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error('This is taking longer than expected. Check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function fmtDate(d: Date | string | number): string {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
