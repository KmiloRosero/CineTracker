const { getDb } = require('../db/database.js');

function create(name) {
  const stmt = getDb().prepare('INSERT INTO lists (name) VALUES (?)');
  const result = stmt.run(name);
  return getDb().prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
}

function addTitle(listId, titleId) {
  getDb()
    .prepare('INSERT OR IGNORE INTO list_titles (list_id, title_id) VALUES (?, ?)')
    .run(listId, titleId);
  return { listId, titleId };
}

function findAllWithTitles() {
  const db = getDb();
  const lists = db.prepare('SELECT * FROM lists ORDER BY created_at DESC').all();

  return lists.map((list) => ({
    ...list,
    titles: db
      .prepare(`
        SELECT t.* FROM titles t
        JOIN list_titles lt ON lt.title_id = t.id
        WHERE lt.list_id = ?
        ORDER BY lt.added_at DESC
      `)
      .all(list.id),
  }));
}

module.exports = { create, addTitle, findAllWithTitles };
