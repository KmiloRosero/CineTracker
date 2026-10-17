const { getDb } = require('../db/database.js');

function getGenreCounts(userId) {
  return getDb()
    .prepare(`
      SELECT value AS genre, COUNT(*) AS n
      FROM titles, json_each(titles.genres)
      WHERE user_id = ? AND genres IS NOT NULL AND json_valid(genres)
      GROUP BY value
      ORDER BY n DESC
      LIMIT 10
    `)
    .all(userId);
}

function getMonthlyWatched(userId) {
  return getDb()
    .prepare(`
      SELECT strftime('%Y-%m', updated_at) AS month, COUNT(*) AS n
      FROM titles
      WHERE user_id = ? AND status = 'completed'
        AND updated_at >= datetime('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `)
    .all(userId);
}

function getTotalHours(userId) {
  const row = getDb()
    .prepare(`
      SELECT ROUND(SUM(COALESCE(runtime, 0)) / 60.0, 2) AS totalHours
      FROM titles
      WHERE user_id = ? AND status = 'completed'
    `)
    .get(userId);
  return { totalHours: row?.totalHours ?? 0 };
}

function getTopGenres(userId, limit = 5) {
  return getDb()
    .prepare(`
      SELECT value AS genre, COUNT(*) AS n
      FROM titles, json_each(titles.genres)
      WHERE user_id = ? AND genres IS NOT NULL AND json_valid(genres)
        AND status = 'completed'
      GROUP BY value
      ORDER BY n DESC
      LIMIT ?
    `)
    .all(userId, limit);
}

module.exports = { getGenreCounts, getMonthlyWatched, getTotalHours, getTopGenres };
