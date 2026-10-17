const { getDb } = require('../db/database.js');

function findById(userId, id) {
  return getDb().prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, userId);
}

function create(userId, record) {
  const result = getDb().prepare(`
    INSERT INTO records (user_id, title_id, watched_date, rating, platform, status, note)
    VALUES (@user_id, @title_id, @watched_date, @rating, @platform, @status, @note)
  `).run({
    user_id:      userId,
    title_id:     record.title_id,
    watched_date: record.watched_date ?? new Date().toISOString(),
    rating:       record.rating   ?? null,
    platform:     record.platform ?? null,
    status:       record.status   ?? 'completed',
    note:         record.note     ?? null,
  });
  return findById(userId, result.lastInsertRowid);
}

function findByTitleId(userId, titleId) {
  return getDb()
    .prepare('SELECT * FROM records WHERE title_id = ? AND user_id = ? ORDER BY watched_date DESC, id DESC')
    .all(titleId, userId);
}

function updateStatus(userId, id, status, rating = null) {
  getDb()
    .prepare('UPDATE records SET status = ?, rating = ? WHERE id = ? AND user_id = ?')
    .run(status, rating, id, userId);
  return findById(userId, id);
}

module.exports = { findById, create, findByTitleId, updateStatus };
