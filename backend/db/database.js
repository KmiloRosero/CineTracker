const path = require('path');
const fs = require('fs');

// Ensure native modules (better-sqlite3) resolve from frontend/node_modules
// since that is where npm install was run.
const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
if (!module.paths.includes(frontendModules)) {
  module.paths.unshift(frontendModules);
}

const Database = require('better-sqlite3');
const { runMigrations, latestVersion } = require('./migrations.js');

let db;

/**
 * Opens the database, applies the baseline schema and any pending migrations.
 * `dbPath` defaults to Electron's userData folder; tests pass a temp file.
 */
function initDatabase(dbPath) {
  if (!dbPath) {
    const { app } = require('electron');
    dbPath = path.join(app.getPath('userData'), 'cinetracker.db');
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  backupBeforeMigrating(dbPath);
  runMigrations(db);

  return db;
}

// Copies the database file once before a pending migration touches it, so an
// upgrade can always be rolled back by hand (cinetracker.db.pre-v<N>.bak).
function backupBeforeMigrating(dbPath) {
  const current = db.pragma('user_version', { simple: true });
  const target  = latestVersion();
  if (current >= target) return;
  const hasData = db.prepare('SELECT COUNT(*) AS n FROM titles').get().n > 0;
  if (!hasData) return;

  db.pragma('wal_checkpoint(TRUNCATE)');
  const backupPath = `${dbPath}.pre-v${target}.bak`;
  if (!fs.existsSync(backupPath)) fs.copyFileSync(dbPath, backupPath);
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function closeDatabase() {
  db?.close();
  db = undefined;
}

module.exports = { initDatabase, getDb, closeDatabase };
