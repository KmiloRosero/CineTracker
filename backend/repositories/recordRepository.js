const { getDb } = require('../db/database.js');

function create(record) {
  const stmt = getDb().prepare(`
    INSERT INTO records (title_id, watched_date, rating, platform, status, note)
    VALUES (@title_id, @watched_date, @rating, @platform, @status, @note)
  `);
  const result = stmt.run(record);
  return getDb().prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
}

function findByTitleId(titleId) {
  return getDb()
    .prepare('SELECT * FROM records WHERE title_id = ? ORDER BY watched_date DESC')
    .all(titleId);
}

function updateStatus(id, status, rating = null) {
  getDb()
    .prepare('UPDATE records SET status = ?, rating = ? WHERE id = ?')
    .run(status, rating, id);
  return getDb().prepare('SELECT * FROM records WHERE id = ?').get(id);
}

module.exports = { create, findByTitleId, updateStatus };
