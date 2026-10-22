const { getDb } = require('../db/database.js');

// TMDB titles the user marked "No me interesa".

function add(userId, { tmdb_id, type, title }) {
  getDb()
    .prepare('INSERT OR IGNORE INTO dismissed_titles (user_id, tmdb_id, type, title) VALUES (?, ?, ?, ?)')
    .run(userId, tmdb_id, type, title);
}

function remove(userId, tmdbId, type) {
  getDb().prepare('DELETE FROM dismissed_titles WHERE user_id = ? AND tmdb_id = ? AND type = ?').run(userId, tmdbId, type);
}

/** Newest first. */
function findAll(userId) {
  return getDb()
    .prepare('SELECT tmdb_id, type, title, created_at FROM dismissed_titles WHERE user_id = ? ORDER BY created_at DESC, rowid DESC')
    .all(userId);
}

module.exports = { add, remove, findAll };
