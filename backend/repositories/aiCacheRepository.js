const { getDb } = require('../db/database.js');

// Generated AI answers per user, valid while their signature (a digest of the
// data they were built from) still matches.

function get(userId, key) {
  const row = getDb()
    .prepare('SELECT signature, payload, created_at FROM ai_cache WHERE user_id = ? AND cache_key = ?')
    .get(userId, key);
  if (!row) return null;
  try {
    return { signature: row.signature, payload: JSON.parse(row.payload), createdAt: row.created_at };
  } catch {
    return null;
  }
}

function set(userId, key, signature, payload) {
  getDb()
    .prepare(`
      INSERT INTO ai_cache (user_id, cache_key, signature, payload, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT (user_id, cache_key) DO UPDATE SET
        signature = excluded.signature, payload = excluded.payload, created_at = excluded.created_at
    `)
    .run(userId, key, signature, JSON.stringify(payload));
}

function remove(userId, key) {
  getDb().prepare('DELETE FROM ai_cache WHERE user_id = ? AND cache_key = ?').run(userId, key);
}

module.exports = { get, set, remove };
