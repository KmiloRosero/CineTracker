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

module.exports = { create, findByEmail, findById };
