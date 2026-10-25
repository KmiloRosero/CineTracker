const { getDb } = require('../db/database.js');

// TMDB titles already suggested to each user, with when and how often.

/** Records that `items` ([{ tmdb_id, type }]) were just shown. */
function logShown(userId, items) {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO suggestion_log (user_id, type, tmdb_id) VALUES (?, ?, ?)
    ON CONFLICT (user_id, type, tmdb_id) DO UPDATE SET times = times + 1, shown_at = datetime('now')
  `);
  db.transaction(() => {
    items.forEach((i) => { if (Number.isInteger(i?.tmdb_id) && (i.type === 'movie' || i.type === 'series')) upsert.run(userId, i.type, i.tmdb_id); });
  })();
}

/** Suggestions shown in the last `days` days: Map "type:tmdbId" -> { days, times }. */
function recent(userId, days = 30) {
  const rows = getDb().prepare(`
    SELECT type, tmdb_id, times, julianday('now') - julianday(shown_at) AS age
    FROM suggestion_log WHERE user_id = ? AND shown_at >= datetime('now', ?)
  `).all(userId, `-${Number(days)} days`);
  return new Map(rows.map((r) => [`${r.type}:${r.tmdb_id}`, { days: r.age, times: r.times }]));
}

module.exports = { logShown, recent };
