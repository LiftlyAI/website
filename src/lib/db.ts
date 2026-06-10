// Data layer — Supabase Postgres via postgres.js.
//
// Why postgres.js + the Supabase *transaction* pooler (port 6543): Vercel runs
// each route in a short-lived serverless function with a read-only filesystem,
// so the old better-sqlite3 file DB couldn't exist there (ENOENT). A direct
// Postgres connection through the pooler is the serverless-safe replacement.
//
// All access here is server-side and already gated by our own cookie auth
// (see auth.ts), so we connect with the trusted DB role and do NOT rely on
// Supabase RLS — the app enforces per-athlete access via `athlete_id`.
//
// The query helpers keep the existing `?`-placeholder SQL intact by rewriting
// `?` -> `$1..$n` before sending. `ON CONFLICT (...) DO UPDATE SET x =
// excluded.x` is valid in both SQLite and Postgres, so those survive unchanged.

import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

// Reuse one client across hot-reloads (dev) and warm invocations (serverless).
const globalForPg = globalThis as unknown as { _coachSql?: Sql };

function client(): Sql {
  if (globalForPg._coachSql) return globalForPg._coachSql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add your Supabase Postgres connection string ' +
        '(Project Settings → Database → Connection string → Transaction pooler) ' +
        'to .env.local and to your Vercel environment variables.',
    );
  }

  const sql = postgres(url, {
    // The transaction pooler (PgBouncer) does not support prepared statements.
    prepare: false,
    ssl: 'require',
    // Serverless: keep the per-instance pool tiny.
    max: 1,
    idle_timeout: 20,
    types: {
      // Return int8/bigint columns — our `created_at` millisecond timestamps and
      // every COUNT(*) — as plain JS numbers instead of strings/BigInt. All such
      // values are well under 2^53, so this is lossless and matches the old
      // better-sqlite3 behaviour the rest of the code assumes.
      bigint: {
        to: 20,
        from: [20],
        serialize: (x: number | bigint) => x.toString(),
        parse: (x: string) => Number(x),
      },
    },
  });

  globalForPg._coachSql = sql;
  return sql;
}

// `?` placeholders -> `$1..$n`. None of our SQL contains `?` inside string
// literals, so a plain sequential replace is safe.
function toPg(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

/** Run a query and return all rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = await client().unsafe(toPg(text), params as never[]);
  return rows as unknown as T[];
}

/** Run a query and return the first row (or undefined). */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/** Run a write (INSERT/UPDATE/DELETE) where the result rows are not needed. */
export async function execute(text: string, params: unknown[] = []): Promise<void> {
  await client().unsafe(toPg(text), params as never[]);
}

export function uuid(): string {
  return crypto.randomUUID();
}
