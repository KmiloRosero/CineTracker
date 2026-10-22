const { getDb } = require('../db/database.js');

// People and genres whose releases each user follows.

function findAll(userId) {
  return getDb()
    .prepare('SELECT kind, ref, name, image_path, role, created_at FROM follows WHERE user_id = ? ORDER BY kind, name COLLATE NOCASE')
    .all(userId);
}

function add(userId, { kind, ref, name, image_path = null, role = null }) {
  getDb()
    .prepare(`
      INSERT INTO follows (user_id, kind, ref, name, image_path, role) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, kind, ref) DO UPDATE SET name = excluded.name, image_path = excluded.image_path, role = excluded.role
    `)
    .run(userId, kind, ref, name, image_path, role);
}

function remove(userId, kind, ref) {
  getDb().prepare('DELETE FROM follows WHERE user_id = ? AND kind = ? AND ref = ?').run(userId, kind, ref);
}

module.exports = { findAll, add, remove };
