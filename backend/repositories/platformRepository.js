const { getDb } = require('../db/database.js');

// The streaming services each user pays for.

function findAll(userId) {
  return getDb()
    .prepare('SELECT provider_id AS id, name, logo_path FROM user_platforms WHERE user_id = ? ORDER BY name COLLATE NOCASE')
    .all(userId);
}

/** Replaces the user's platforms with `platforms` ([{ id, name, logo_path }]). */
function replaceAll(userId, platforms) {
  const db = getDb();
  const insert = db.prepare('INSERT INTO user_platforms (user_id, provider_id, name, logo_path) VALUES (?, ?, ?, ?)');
  db.transaction(() => {
    db.prepare('DELETE FROM user_platforms WHERE user_id = ?').run(userId);
    platforms.forEach((p) => insert.run(userId, p.id, p.name, p.logo_path ?? null));
  })();
}

module.exports = { findAll, replaceAll };
