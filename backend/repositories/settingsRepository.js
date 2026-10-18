const { getDb } = require('../db/database.js');

// Installation-wide key/value settings (theme, sealed API keys, remembered session).

function get(key) {
  return getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;
}

function set(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function remove(key) {
  getDb().prepare('DELETE FROM settings WHERE key = ?').run(key);
}

module.exports = { get, set, remove };
