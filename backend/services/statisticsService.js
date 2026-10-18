const { getDb } = require('../db/database.js');

const MONTHS_OF_ACTIVITY = 12;

function getGenreCounts(userId, limit = 10) {
  return getDb()
    .prepare(`
      SELECT value AS genre, COUNT(*) AS n
      FROM titles, json_each(titles.genres)
      WHERE user_id = ? AND genres IS NOT NULL AND json_valid(genres)
      GROUP BY value
      ORDER BY n DESC, genre ASC
      LIMIT ?
    `)
    .all(userId, limit);
}

/** Genres of completed titles, most watched first. */
function getTopGenres(userId, limit = 5) {
  return getDb()
    .prepare(`
      SELECT value AS genre, COUNT(*) AS n
      FROM titles, json_each(titles.genres)
      WHERE user_id = ? AND genres IS NOT NULL AND json_valid(genres)
        AND status = 'completed'
      GROUP BY value
      ORDER BY n DESC, genre ASC
      LIMIT ?
    `)
    .all(userId, limit);
}

/** Genres ranked by average rating, ignoring genres with fewer than `minTitles` rated titles. */
function getTopRatedGenres(userId, limit = 5, minTitles = 2) {
  return getDb()
    .prepare(`
      SELECT value AS genre, ROUND(AVG(rating), 1) AS avgRating, COUNT(*) AS n
      FROM titles, json_each(titles.genres)
      WHERE user_id = ? AND rating IS NOT NULL AND genres IS NOT NULL AND json_valid(genres)
      GROUP BY value
      HAVING COUNT(*) >= ?
      ORDER BY avgRating DESC, n DESC, genre ASC
      LIMIT ?
    `)
    .all(userId, minTitles, limit);
}

/** 'YYYY-MM' keys for the last `count` months, oldest first, in UTC like SQLite. */
function lastMonths(count, now = new Date()) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/**
 * Completed watches per month for the last 12 months, zero-filled.
 * Uses each watch record's date; completed titles without any record fall
 * back to the date they were last updated.
 */
function getMonthlyWatched(userId, now = new Date()) {
  const months = lastMonths(MONTHS_OF_ACTIVITY, now);
  const rows = getDb()
    .prepare(`
      SELECT month, COUNT(*) AS n FROM (
        SELECT strftime('%Y-%m', watched_date) AS month
        FROM records
        WHERE user_id = ? AND status = 'completed'
        UNION ALL
        SELECT strftime('%Y-%m', updated_at) AS month
        FROM titles t
        WHERE t.user_id = ? AND t.status = 'completed'
          AND NOT EXISTS (SELECT 1 FROM records r WHERE r.title_id = t.id)
      )
      WHERE month >= ?
      GROUP BY month
    `)
    .all(userId, userId, months[0]);
  const byMonth = Object.fromEntries(rows.map((r) => [r.month, r.n]));
  return months.map((month) => ({ month, n: byMonth[month] ?? 0 }));
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

function getTotals(userId) {
  const row = getDb()
    .prepare(`
      SELECT
        COUNT(*)                                            AS titles,
        COALESCE(SUM(type = 'movie'), 0)                    AS movies,
        COALESCE(SUM(type = 'series'), 0)                   AS series,
        COALESCE(SUM(status = 'pending'), 0)                AS pending,
        COALESCE(SUM(status = 'watching'), 0)               AS watching,
        COALESCE(SUM(status = 'completed'), 0)              AS completed,
        COALESCE(SUM(status = 'dropped'), 0)                AS dropped,
        COUNT(rating)                                       AS rated,
        ROUND(AVG(rating), 1)                               AS averageRating
      FROM titles
      WHERE user_id = ?
    `)
    .get(userId);
  return row;
}

/**
 * This month against last month for the stats that have dated history:
 * titles added, completed watches, hours watched and average score of watches.
 * (Status changes are not dated, so "watching" has no trend.)
 */
function getMonthlyTrends(userId, now = new Date()) {
  const [previous, current] = lastMonths(2, now);
  const db = getDb();

  const added = db.prepare(`
    SELECT strftime('%Y-%m', added_at) AS month, COUNT(*) AS n
    FROM titles WHERE user_id = ? AND strftime('%Y-%m', added_at) IN (?, ?)
    GROUP BY month
  `).all(userId, previous, current);

  // completed watches: dated records, or the update date for completed titles without records
  const watches = db.prepare(`
    SELECT month, COUNT(*) AS n, ROUND(SUM(COALESCE(runtime, 0)) / 60.0, 1) AS hours,
           ROUND(AVG(rating), 1) AS avgRating
    FROM (
      SELECT strftime('%Y-%m', r.watched_date) AS month, t.runtime, r.rating
      FROM records r JOIN titles t ON t.id = r.title_id
      WHERE r.user_id = ? AND r.status = 'completed'
      UNION ALL
      SELECT strftime('%Y-%m', t.updated_at) AS month, t.runtime, t.rating
      FROM titles t
      WHERE t.user_id = ? AND t.status = 'completed'
        AND NOT EXISTS (SELECT 1 FROM records r WHERE r.title_id = t.id)
    )
    WHERE month IN (?, ?)
    GROUP BY month
  `).all(userId, userId, previous, current);

  const pick = (rows, month, key) => rows.find((r) => r.month === month)?.[key] ?? 0;
  const pickOrNull = (rows, month, key) => rows.find((r) => r.month === month)?.[key] ?? null;
  return {
    titlesAdded:   { current: pick(added, current, 'n'),       previous: pick(added, previous, 'n') },
    completed:     { current: pick(watches, current, 'n'),     previous: pick(watches, previous, 'n') },
    hours:         { current: pick(watches, current, 'hours'), previous: pick(watches, previous, 'hours') },
    averageRating: { current: pickOrNull(watches, current, 'avgRating'), previous: pickOrNull(watches, previous, 'avgRating') },
  };
}

/** Everything the Statistics page needs in one call. */
function getOverview(userId) {
  const totals = getTotals(userId);
  // Share of titles the user finished, out of everything they started or finished.
  const started = totals.watching + totals.completed + totals.dropped;
  return {
    totals: {
      titles: totals.titles, movies: totals.movies, series: totals.series,
      pending: totals.pending, watching: totals.watching,
      completed: totals.completed, dropped: totals.dropped,
    },
    completionRate: started ? Math.round((totals.completed / started) * 1000) / 10 : 0,
    averageRating:  totals.averageRating ?? null,
    ratedCount:     totals.rated,
    totalHours:     getTotalHours(userId).totalHours,
    genreDistribution: getGenreCounts(userId),
    topGenres:         getTopGenres(userId),
    topRatedGenres:    getTopRatedGenres(userId),
    monthlyActivity:   getMonthlyWatched(userId),
    trends:            getMonthlyTrends(userId),
  };
}

module.exports = {
  getGenreCounts, getTopGenres, getTopRatedGenres, getMonthlyWatched,
  getTotalHours, getMonthlyTrends, getOverview, lastMonths,
};
