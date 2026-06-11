// Applies db/schema.sql to your Supabase Postgres. Run once: `npm run db:init`.
// Requires DATABASE_URL — this loads it from .env.local if present, so the same
// connection string the app uses also provisions the tables.
//
// You can equivalently paste db/schema.sql into the Supabase SQL Editor.
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

// Minimal .env.local loader (tsx does not auto-load it for standalone scripts).
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    'DATABASE_URL is not set. Add your Supabase Postgres connection string to .env.local\n' +
      '(Project Settings → Database → Connection string → Transaction pooler).',
  );
  process.exit(1);
}

const schema = fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8');

const sql = postgres(url, { prepare: false, ssl: 'require', max: 1 });

(async () => {
  try {
    await sql.unsafe(schema);
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name
    `;
    console.log('Schema applied. Tables:', tables.map((t) => t.table_name).join(', '));
  } catch (err) {
    console.error('Failed to apply schema:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
