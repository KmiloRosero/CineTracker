const { getDb } = require('../db/database.js');

function getGenreCounts() {
  return getDb()
    .prepare(`
      SELECT value AS genre, COUNT(*) AS n
      FROM titles, json_each(titles.genres)
      WHERE genres IS NOT NULL
      GROUP BY value
      ORDER BY n DESC
      LIMIT 10
    `)
    .all();
}

function getMonthlyWatched() {
  return getDb()
    .prepare(`
      SELECT strftime('%Y-%m', updated_at) AS month, COUNT(*) AS n
      FROM titles
      WHERE status = 'completed'
        AND updated_at >= datetime('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `)
    .all();
}

function getTotalHours() {
  const row = getDb()
    .prepare(`
      SELECT ROUND(SUM(COALESCE(runtime, 0)) / 60.0, 2) AS totalHours
      FROM titles
      WHERE status = 'completed'
    `)
    .get();
  return { totalHours: row?.totalHours ?? 0 };
}

function getTopGenres(limit = 5) {
  return getDb()
    .prepare(`
      SELECT value AS genre, COUNT(*) AS n
      FROM titles, json_each(titles.genres)
      WHERE genres IS NOT NULL
        AND status = 'completed'
      GROUP BY value
      ORDER BY n DESC
      LIMIT ?
    `)
    .all(limit);
}

module.exports = { getGenreCounts, getMonthlyWatched, getTotalHours, getTopGenres };
