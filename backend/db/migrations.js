/**
 * Versioned schema migrations.
 *
 * schema.sql is the baseline (version 0) and only uses CREATE ... IF NOT EXISTS,
 * so it is safe on every start. Each migration below runs once, in order, inside
 * a transaction, and bumps PRAGMA user_version. Never edit a shipped migration;
 * add a new one instead.
 */

const MIGRATIONS = [
  {
    version: 1,
    name: 'per-user ownership of titles, records and lists',
    // Table rebuilds need foreign keys off so dependent rows are not cascaded.
    rebuildsTables: true,
    up(db) {
      // Existing data goes to the oldest account. With no accounts yet it stays
      // NULL and is claimed by the first account that registers.
      const owner = db.prepare('SELECT MIN(id) AS id FROM users').get().id ?? null;

      // titles: add user_id; tmdb_id becomes unique per user instead of globally.
      db.exec(`
        CREATE TABLE titles_new (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
          tmdb_id          INTEGER,
          type             TEXT NOT NULL CHECK(type IN ('movie', 'series')),
          title            TEXT NOT NULL,
          original_title   TEXT,
          overview         TEXT,
          poster_path      TEXT,
          backdrop_path    TEXT,
          release_year     INTEGER,
          genres           TEXT,
          runtime          INTEGER,
          status           TEXT NOT NULL DEFAULT 'pending'
                           CHECK(status IN ('pending', 'watching', 'completed', 'dropped')),
          rating           REAL CHECK(rating BETWEEN 0 AND 10),
          notes            TEXT,
          added_at         TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (user_id, tmdb_id)
        );
      `);
      db.prepare(`
        INSERT INTO titles_new
          (id, user_id, tmdb_id, type, title, original_title, overview, poster_path,
           backdrop_path, release_year, genres, runtime, status, rating, notes,
           added_at, updated_at)
        SELECT
           id, ?, tmdb_id, type, title, original_title, overview, poster_path,
           backdrop_path, release_year, genres, runtime, status, rating, notes,
           added_at, updated_at
        FROM titles
      `).run(owner);
      db.exec(`
        DROP TABLE titles;
        ALTER TABLE titles_new RENAME TO titles;

        CREATE TRIGGER IF NOT EXISTS titles_updated_at
        AFTER UPDATE ON titles
        BEGIN
          UPDATE titles SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
      `);

      // records: owner follows the title it belongs to.
      db.exec(`
        ALTER TABLE records ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        UPDATE records SET user_id = (SELECT user_id FROM titles WHERE titles.id = records.title_id);
      `);

      // lists: add user_id; list names become unique per user.
      db.exec(`
        CREATE TABLE lists_new (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name       TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (user_id, name)
        );
      `);
      db.prepare(`
        INSERT INTO lists_new (id, user_id, name, created_at)
        SELECT id, ?, name, created_at FROM lists
      `).run(owner);
      db.exec(`
        DROP TABLE lists;
        ALTER TABLE lists_new RENAME TO lists;
      `);

      // Indexes on foreign keys and the common per-user filters.
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_titles_user_status ON titles(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_records_title      ON records(title_id);
        CREATE INDEX IF NOT EXISTS idx_records_user       ON records(user_id);
        CREATE INDEX IF NOT EXISTS idx_lists_user         ON lists(user_id);
        CREATE INDEX IF NOT EXISTS idx_list_titles_title  ON list_titles(title_id);
      `);
    },
  },
  {
    version: 2,
    name: 'cast members on titles',
    rebuildsTables: false,
    up(db) {
      // JSON array of { name, character } for the top-billed cast (from TMDB credits).
      db.exec('ALTER TABLE titles ADD COLUMN cast_members TEXT');
    },
  },
  {
    version: 3,
    name: 'remembered sessions',
    rebuildsTables: false,
    up(db) {
      // "Keep me signed in": only a SHA-256 of the token is stored here; the
      // token itself is kept encrypted with the OS (see rememberService).
      db.exec(`
        CREATE TABLE remembered_sessions (
          token_hash  TEXT PRIMARY KEY,
          user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at  TEXT NOT NULL,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_remembered_sessions_user ON remembered_sessions(user_id);
      `);
    },
  },
];

function runMigrations(db) {
  const current = db.pragma('user_version', { simple: true });

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;

    if (migration.rebuildsTables) db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        migration.up(db);
        const violations = db.pragma('foreign_key_check');
        if (violations.length > 0) {
          throw new Error(`Migration ${migration.version} left ${violations.length} foreign key violation(s).`);
        }
        db.pragma(`user_version = ${migration.version}`);
      })();
    } catch (err) {
      throw new Error(`Database migration ${migration.version} (${migration.name}) failed: ${err.message}`);
    } finally {
      if (migration.rebuildsTables) db.pragma('foreign_keys = ON');
    }
  }
}

function latestVersion() {
  return MIGRATIONS[MIGRATIONS.length - 1].version;
}

module.exports = { runMigrations, latestVersion, MIGRATIONS };
