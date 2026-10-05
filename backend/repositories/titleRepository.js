const { getDb } = require('../db/database.js');

function create(title) {
  const stmt = getDb().prepare(`
    INSERT INTO titles
      (tmdb_id, type, title, original_title, overview, poster_path,
       backdrop_path, release_year, genres, runtime, status, rating, notes)
    VALUES
      (@tmdb_id, @type, @title, @original_title, @overview, @poster_path,
       @backdrop_path, @release_year, @genres, @runtime, @status, @rating, @notes)
  `);
  const result = stmt.run(title);
  return findById(result.lastInsertRowid);
}

function findAll(filters = {}) {
  const { status, type, search } = filters;
  let query = 'SELECT * FROM titles WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (type)   { query += ' AND type = ?';   params.push(type); }
  if (search) { query += ' AND title LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY added_at DESC';
  return getDb().prepare(query).all(...params);
}

function findById(id) {
  return getDb().prepare('SELECT * FROM titles WHERE id = ?').get(id);
}

function update(id, data) {
  const fields = Object.keys(data).map((k) => `${k} = @${k}`).join(', ');
  getDb().prepare(`UPDATE titles SET ${fields} WHERE id = @id`).run({ ...data, id });
  return findById(id);
}

function remove(id) {
  getDb().prepare('DELETE FROM titles WHERE id = ?').run(id);
  return { deleted: true, id };
}

module.exports = { create, findAll, findById, update, remove };
