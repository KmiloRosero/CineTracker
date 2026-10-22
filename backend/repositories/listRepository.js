const { getDb } = require('../db/database.js');

function findById(userId, id) {
  return getDb().prepare('SELECT * FROM lists WHERE id = ? AND user_id = ?').get(id, userId);
}

function findByName(userId, name) {
  return getDb()
    .prepare('SELECT * FROM lists WHERE user_id = ? AND name = ? COLLATE NOCASE')
    .get(userId, name);
}

function create(userId, name, description = null) {
  const result = getDb()
    .prepare('INSERT INTO lists (user_id, name, description) VALUES (?, ?, ?)')
    .run(userId, name, description);
  return findById(userId, result.lastInsertRowid);
}

function rename(userId, id, name) {
  getDb().prepare('UPDATE lists SET name = ? WHERE id = ? AND user_id = ?').run(name, id, userId);
  return findById(userId, id);
}

function remove(userId, id) {
  getDb().prepare('DELETE FROM lists WHERE id = ? AND user_id = ?').run(id, userId);
  return { deleted: true, id };
}

// Ownership of both list and title is checked by the caller (service layer).
// `note` is why a generated list picked the title.
function addTitle(listId, titleId, note = null) {
  getDb()
    .prepare('INSERT OR IGNORE INTO list_titles (list_id, title_id, note) VALUES (?, ?, ?)')
    .run(listId, titleId, note);
  return { listId, titleId };
}

function removeTitle(listId, titleId) {
  getDb().prepare('DELETE FROM list_titles WHERE list_id = ? AND title_id = ?').run(listId, titleId);
  return { listId, titleId, removed: true };
}

const TITLES_OF_LIST = `
  SELECT t.*, lt.note AS list_note FROM titles t
  JOIN list_titles lt ON lt.title_id = t.id
  WHERE lt.list_id = ?
  ORDER BY lt.added_at DESC, lt.rowid ASC
`;

function findByIdWithTitles(userId, id) {
  const list = findById(userId, id);
  if (!list) return null;
  return { ...list, titles: getDb().prepare(TITLES_OF_LIST).all(id) };
}

function findAllWithTitles(userId) {
  const db = getDb();
  const lists = db.prepare('SELECT * FROM lists WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId);
  const titlesOf = db.prepare(TITLES_OF_LIST);
  return lists.map((list) => ({ ...list, titles: titlesOf.all(list.id) }));
}

/** Ids of the user's lists that contain `titleId`. */
function findListIdsForTitle(userId, titleId) {
  return getDb()
    .prepare(`
      SELECT l.id FROM lists l
      JOIN list_titles lt ON lt.list_id = l.id
      WHERE l.user_id = ? AND lt.title_id = ?
    `)
    .all(userId, titleId)
    .map((row) => row.id);
}

module.exports = {
  findById, findByName, create, rename, remove,
  addTitle, removeTitle, findByIdWithTitles, findAllWithTitles, findListIdsForTitle,
};
