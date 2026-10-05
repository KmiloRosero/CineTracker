const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;

function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'cinetracker.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function addTitle(title) {
  const stmt = getDb().prepare(`
    INSERT INTO titles
      (tmdb_id, type, title, original_title, overview, poster_path,
       backdrop_path, release_year, genres, runtime, status, rating, notes)
    VALUES
      (@tmdb_id, @type, @title, @original_title, @overview, @poster_path,
       @backdrop_path, @release_year, @genres, @runtime, @status, @rating, @notes)
  `);
  const result = stmt.run(title);
  return getTitleById(result.lastInsertRowid);
}

function getAllTitles(filters = {}) {
  const { status, type, search } = filters;
  let query = 'SELECT * FROM titles WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (type)   { query += ' AND type = ?';   params.push(type); }
  if (search) { query += ' AND title LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY added_at DESC';
  return getDb().prepare(query).all(...params);
}

function getTitleById(id) {
  return getDb().prepare('SELECT * FROM titles WHERE id = ?').get(id);
}

function updateTitle(id, data) {
  const fields = Object.keys(data).map((k) => `${k} = @${k}`).join(', ');
  getDb().prepare(`UPDATE titles SET ${fields} WHERE id = @id`).run({ ...data, id });
  return getTitleById(id);
}

function deleteTitle(id) {
  getDb().prepare('DELETE FROM titles WHERE id = ?').run(id);
  return { deleted: true, id };
}

function addRecord(record) {
  const stmt = getDb().prepare(`
    INSERT INTO records (title_id, watched_date, rating, platform, status, note)
    VALUES (@title_id, @watched_date, @rating, @platform, @status, @note)
  `);
  const result = stmt.run(record);
  return getDb().prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
}

function getRecordsByTitle(titleId) {
  return getDb()
    .prepare('SELECT * FROM records WHERE title_id = ? ORDER BY watched_date DESC')
    .all(titleId);
}

function updateRecordStatus(id, status, rating = null) {
  getDb()
    .prepare('UPDATE records SET status = ?, rating = ? WHERE id = ?')
    .run(status, rating, id);
  return getDb().prepare('SELECT * FROM records WHERE id = ?').get(id);
}

function createList(name) {
  const stmt = getDb().prepare('INSERT INTO lists (name) VALUES (?)');
  const result = stmt.run(name);
  return getDb().prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
}

function addTitleToList(listId, titleId) {
  getDb()
    .prepare('INSERT OR IGNORE INTO list_titles (list_id, title_id) VALUES (?, ?)')
    .run(listId, titleId);
  return { listId, titleId };
}

function getListsWithTitles() {
  const lists = getDb().prepare('SELECT * FROM lists ORDER BY created_at DESC').all();
  return lists.map((list) => ({
    ...list,
    titles: getDb()
      .prepare(`
        SELECT t.* FROM titles t
        JOIN list_titles lt ON lt.title_id = t.id
        WHERE lt.list_id = ?
        ORDER BY lt.added_at DESC
      `)
      .all(list.id),
  }));
}

function getSetting(key) {
  return getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value;
}

function setSetting(key, value) {
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, String(value));
}

function getStats() {
  const database = getDb();
  return {
    total:     database.prepare('SELECT COUNT(*) as n FROM titles').get().n,
    completed: database.prepare("SELECT COUNT(*) as n FROM titles WHERE status='completed'").get().n,
    watching:  database.prepare("SELECT COUNT(*) as n FROM titles WHERE status='watching'").get().n,
    pending:   database.prepare("SELECT COUNT(*) as n FROM titles WHERE status='pending'").get().n,
    dropped:   database.prepare("SELECT COUNT(*) as n FROM titles WHERE status='dropped'").get().n,
    avgRating: database.prepare('SELECT AVG(rating) as avg FROM titles WHERE rating IS NOT NULL').get().avg,
    byType:    database.prepare('SELECT type, COUNT(*) as n FROM titles GROUP BY type').all(),
    byGenre:   database.prepare(`
      SELECT value as genre, COUNT(*) as n
      FROM titles, json_each(titles.genres)
      WHERE genres IS NOT NULL
      GROUP BY value
      ORDER BY n DESC
      LIMIT 10
    `).all(),
  };
}

module.exports = {
  initDatabase,
  getDb,
  addTitle,
  getAllTitles,
  getTitleById,
  updateTitle,
  deleteTitle,
  addRecord,
  getRecordsByTitle,
  updateRecordStatus,
  createList,
  addTitleToList,
  getListsWithTitles,
  getSetting,
  setSetting,
  getStats,
};
