const { getDb } = require('../db/database.js');

function create({ name, email, passwordHash, avatarUrl = null }) {
  const stmt = getDb().prepare(`
    INSERT INTO users (name, email, password_hash, avatar_url)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(name, email, passwordHash, avatarUrl);
  return findById(result.lastInsertRowid);
}

function findByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function count() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

function updateProfile(id, { name, avatarUrl }) {
  getDb().prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?').run(name, avatarUrl, id);
  return findById(id);
}

function updatePasswordHash(id, passwordHash) {
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

/** Deletes the user; titles, records and lists cascade through their user_id foreign keys. */
function remove(id) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

/** Gives rows without an owner (data from before accounts existed) to `userId`. */
function claimUnownedData(userId) {
  const db = getDb();
  db.transaction(() => {
    db.prepare('UPDATE titles  SET user_id = ? WHERE user_id IS NULL').run(userId);
    db.prepare('UPDATE records SET user_id = ? WHERE user_id IS NULL').run(userId);
    db.prepare('UPDATE lists   SET user_id = ? WHERE user_id IS NULL').run(userId);
  })();
}

module.exports = {
  create, findByEmail, findById, count,
  updateProfile, updatePasswordHash, remove, claimUnownedData,
};
