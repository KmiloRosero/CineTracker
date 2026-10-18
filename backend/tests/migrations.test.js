const fs   = require('fs');
const os   = require('os');
const path = require('path');

// better-sqlite3 is installed under frontend/node_modules.
const frontendModules = path.resolve(__dirname, '../../frontend/node_modules');
const Database = require(require.resolve('better-sqlite3', { paths: [frontendModules] }));

const database = require('../db/database.js');
const { latestVersion } = require('../db/migrations.js');

const SCHEMA = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');

let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetracker-mig-')); });
afterEach(() => {
  database.closeDatabase();
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Builds a database exactly as the app created it before migrations existed. */
function legacyDb(seed) {
  const file = path.join(dir, 'legacy.db');
  const raw = new Database(file);
  raw.exec(SCHEMA);
  seed(raw);
  raw.close();
  return file;
}

describe('migrations', () => {
  it('creates a fresh database at the latest version', () => {
    const db = database.initDatabase(path.join(dir, 'fresh.db'));
    expect(db.pragma('user_version', { simple: true })).toBe(latestVersion());
    const cols = db.prepare('PRAGMA table_info(titles)').all().map((c) => c.name);
    expect(cols).toContain('user_id');
    expect(cols).toContain('cast_members');
  });

  it('gives legacy data to the oldest account and keeps every row', () => {
    const file = legacyDb((raw) => {
      raw.exec(`
        INSERT INTO users (name, email, password_hash) VALUES ('A','a@x.co','h'), ('B','b@x.co','h');
        INSERT INTO titles (tmdb_id, type, title, status) VALUES (1,'movie','One','completed'), (2,'series','Two','pending');
        INSERT INTO records (title_id, status) VALUES (1, 'completed');
        INSERT INTO lists (name) VALUES ('Favourites');
        INSERT INTO list_titles (list_id, title_id) VALUES (1, 1);
      `);
    });

    const db = database.initDatabase(file);
    expect(db.prepare('SELECT DISTINCT user_id FROM titles').all()).toEqual([{ user_id: 1 }]);
    expect(db.prepare('SELECT user_id FROM records').get().user_id).toBe(1);
    expect(db.prepare('SELECT user_id FROM lists').get().user_id).toBe(1);
    // Table rebuilds must not cascade-delete dependent rows.
    expect(db.prepare('SELECT COUNT(*) AS n FROM records').get().n).toBe(1);
    expect(db.prepare('SELECT COUNT(*) AS n FROM list_titles').get().n).toBe(1);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('backs up the file once before migrating a database with data', () => {
    const file = legacyDb((raw) => raw.exec(`INSERT INTO titles (type, title) VALUES ('movie','Old')`));
    database.initDatabase(file);
    expect(fs.existsSync(`${file}.pre-v${latestVersion()}.bak`)).toBe(true);
  });

  it('is idempotent when the app starts again', () => {
    const file = path.join(dir, 'twice.db');
    database.initDatabase(file);
    database.closeDatabase();
    const db = database.initDatabase(file);
    expect(db.pragma('user_version', { simple: true })).toBe(latestVersion());
  });

  it('leaves legacy data unowned when there are no accounts yet', () => {
    const file = legacyDb((raw) => raw.exec(`INSERT INTO titles (type, title) VALUES ('movie','Orphan')`));
    const db = database.initDatabase(file);
    expect(db.prepare('SELECT user_id FROM titles').get().user_id).toBeNull();
  });
});
