const { getDb } = require('../db/database.js');

function findById(userId, id) {
  return getDb().prepare('SELECT * FROM lists WHERE id = ? AND user_id = ?').get(id, userId);
}

function create(userId, name) {
  const result = getDb().prepare('INSERT INTO lists (user_id, name) VALUES (?, ?)').run(userId, name);
  return findById(userId, result.lastInsertRowid);
}

// Ownership of both list and title is checked by the caller (service layer).
function addTitle(listId, titleId) {
  getDb()
    .prepare('INSERT OR IGNORE INTO list_titles (list_id, title_id) VALUES (?, ?)')
    .run(listId, titleId);
  return { listId, titleId };
}

function findAllWithTitles(userId) {
  const db = getDb();
  const lists = db.prepare('SELECT * FROM lists WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId);
  const titlesOf = db.prepare(`
    SELECT t.* FROM titles t
    JOIN list_titles lt ON lt.title_id = t.id
    WHERE lt.list_id = ?
    ORDER BY lt.added_at DESC
  `);
  return lists.map((list) => ({ ...list, titles: titlesOf.all(list.id) }));
}

module.exports = { findById, create, addTitle, findAllWithTitles };
