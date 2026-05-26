import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = process.env.DATABASE_PATH ?? './data/coach.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  ensureSchema(_db);
  return _db;
}

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS athletes (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      profile_json TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      program_json TEXT NOT NULL,
      current_week INTEGER NOT NULL DEFAULT 1,
      current_block TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_logs (
      id TEXT PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      week_number INTEGER,
      day_number INTEGER,
      exercises_json TEXT NOT NULL,
      notes TEXT,
      bodyweight REAL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_session_logs_athlete ON session_logs(athlete_id, date);

    CREATE TABLE IF NOT EXISTS form_checks (
      id TEXT PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      lift_type TEXT NOT NULL,
      video_path TEXT,
      frames_count INTEGER,
      user_context TEXT,
      ai_analysis TEXT,
      estimated_rpe REAL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_form_checks_athlete ON form_checks(athlete_id, created_at);

    -- One row per analysed set: the load + measured mean concentric
    -- velocity + (once the lifter confirms it) the actual RPE/RIR. This is
    -- the lifter's personal load–velocity profile, used to calibrate the
    -- velocity→RPE estimate over time.
    CREATE TABLE IF NOT EXISTS velocity_log (
      id TEXT PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      form_check_id TEXT REFERENCES form_checks(id) ON DELETE CASCADE,
      lift_type TEXT NOT NULL,
      load_kg REAL,
      bodyweight_kg REAL,
      reps INTEGER,
      mcv_ms REAL,
      slowdown_pct REAL,
      actual_rpe REAL,
      date TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_velocity_log_athlete
      ON velocity_log(athlete_id, lift_type, created_at);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_athlete ON chat_messages(athlete_id, created_at);

    CREATE TABLE IF NOT EXISTS bodyweight_logs (
      id TEXT PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      bodyweight REAL NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(athlete_id, date)
    );
  `);

  // Additive migrations for form_checks (existing dbs predate bar-path CV).
  addColumnIfMissing(db, 'form_checks', 'cv_json', 'TEXT');
  addColumnIfMissing(db, 'form_checks', 'rpe_confidence', 'TEXT');
  addColumnIfMissing(db, 'form_checks', 'load_kg', 'REAL');
  // velocity_log predates the move from m/s to slowdown%.
  addColumnIfMissing(db, 'velocity_log', 'slowdown_pct', 'REAL');
  relaxVelocityLogMcv(db);
}

// The first schema shipped `velocity_log.mcv_ms REAL NOT NULL`. We no longer
// write that column (effort is slowdown%, not m/s), so on older dbs the
// constraint blocks every insert. SQLite can't drop NOT NULL via ALTER, so
// rebuild the table without it. No-op once the column is already nullable.
function relaxVelocityLogMcv(db: Database.Database) {
  const cols = db.prepare(`PRAGMA table_info(velocity_log)`).all() as {
    name: string;
    notnull: number;
  }[];
  const mcv = cols.find((c) => c.name === 'mcv_ms');
  if (!mcv || mcv.notnull !== 1) return; // fresh db or already migrated

  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    db.exec(`
      CREATE TABLE velocity_log__new (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
        form_check_id TEXT REFERENCES form_checks(id) ON DELETE CASCADE,
        lift_type TEXT NOT NULL,
        load_kg REAL,
        bodyweight_kg REAL,
        reps INTEGER,
        mcv_ms REAL,
        slowdown_pct REAL,
        actual_rpe REAL,
        date TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT INTO velocity_log__new
        (id, athlete_id, form_check_id, lift_type, load_kg, bodyweight_kg,
         reps, mcv_ms, slowdown_pct, actual_rpe, date, created_at)
        SELECT id, athlete_id, form_check_id, lift_type, load_kg, bodyweight_kg,
               reps, mcv_ms, slowdown_pct, actual_rpe, date, created_at
        FROM velocity_log;
      DROP TABLE velocity_log;
      ALTER TABLE velocity_log__new RENAME TO velocity_log;
      CREATE INDEX IF NOT EXISTS idx_velocity_log_athlete
        ON velocity_log(athlete_id, lift_type, created_at);
    `);
  })();
  db.pragma('foreign_keys = ON');
}

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  type: string,
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}
