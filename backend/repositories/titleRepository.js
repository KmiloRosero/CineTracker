const { getDb } = require('../db/database.js');

// Columns callers may write. update() builds SQL from these names, so the list
// is the guard against arbitrary column names reaching the query.
const WRITABLE_COLUMNS = [
  'tmdb_id', 'type', 'title', 'original_title', 'overview', 'poster_path',
  'backdrop_path', 'release_year', 'genres', 'runtime', 'status', 'rating', 'notes',
  'cast_members',
];

function create(userId, title) {
  const row = { user_id: userId };
  WRITABLE_COLUMNS.forEach((col) => { row[col] = title[col] ?? null; });
  row.status = title.status ?? 'pending';

  const result = getDb().prepare(`
    INSERT INTO titles
      (user_id, tmdb_id, type, title, original_title, overview, poster_path,
       backdrop_path, release_year, genres, runtime, status, rating, notes, cast_members)
    VALUES
      (@user_id, @tmdb_id, @type, @title, @original_title, @overview, @poster_path,
       @backdrop_path, @release_year, @genres, @runtime, @status, @rating, @notes, @cast_members)
  `).run(row);
  return findById(userId, result.lastInsertRowid);
}

function findAll(userId, filters = {}) {
  const { status, type, search } = filters;
  let query = 'SELECT * FROM titles WHERE user_id = ?';
  const params = [userId];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (type)   { query += ' AND type = ?';   params.push(type); }
  if (search) { query += ' AND title LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY added_at DESC, id DESC';
  return getDb().prepare(query).all(...params);
}

function findById(userId, id) {
  return getDb().prepare('SELECT * FROM titles WHERE id = ? AND user_id = ?').get(id, userId);
}

function findByTmdbId(userId, tmdbId) {
  return getDb().prepare('SELECT * FROM titles WHERE tmdb_id = ? AND user_id = ?').get(tmdbId, userId);
}

function update(userId, id, data) {
  const columns = Object.keys(data).filter((k) => WRITABLE_COLUMNS.includes(k));
  if (columns.length === 0) return findById(userId, id);

  const assignments = columns.map((k) => `${k} = @${k}`).join(', ');
  const params = { id, user_id: userId };
  columns.forEach((k) => { params[k] = data[k]; });

  getDb().prepare(`UPDATE titles SET ${assignments} WHERE id = @id AND user_id = @user_id`).run(params);
  return findById(userId, id);
}

function remove(userId, id) {
  getDb().prepare('DELETE FROM titles WHERE id = ? AND user_id = ?').run(id, userId);
  return { deleted: true, id };
}

module.exports = { WRITABLE_COLUMNS, create, findAll, findById, findByTmdbId, update, remove };
