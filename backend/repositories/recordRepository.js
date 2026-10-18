const { getDb } = require('../db/database.js');

const WRITABLE_COLUMNS = ['watched_date', 'rating', 'platform', 'status', 'note'];

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

function update(userId, id, data) {
  const columns = Object.keys(data).filter((k) => WRITABLE_COLUMNS.includes(k));
  if (columns.length === 0) return findById(userId, id);

  const params = { id, user_id: userId };
  columns.forEach((k) => { params[k] = data[k]; });
  getDb()
    .prepare(`UPDATE records SET ${columns.map((k) => `${k} = @${k}`).join(', ')} WHERE id = @id AND user_id = @user_id`)
    .run(params);
  return findById(userId, id);
}

function updateStatus(userId, id, status, rating = null) {
  return update(userId, id, { status, rating });
}

function remove(userId, id) {
  getDb().prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(id, userId);
  return { deleted: true, id };
}

module.exports = { WRITABLE_COLUMNS, findById, create, findByTitleId, update, updateStatus, remove };
