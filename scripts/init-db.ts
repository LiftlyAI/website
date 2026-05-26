// Bootstraps the SQLite tables. Run once: `npm run db:init`
// (Tables are also auto-created on first request, so this is mainly for sanity-checking.)
import { getDb } from '../src/lib/db';

const db = getDb();
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all() as { name: string }[];

console.log('SQLite ready at', process.env.DATABASE_PATH ?? './data/coach.db');
console.log('Tables:', tables.map((t) => t.name).join(', '));
