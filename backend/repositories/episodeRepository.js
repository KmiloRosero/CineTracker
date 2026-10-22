const { getDb } = require('../db/database.js');

// Episodes the user marked as watched. Ownership of the title is checked by the service.

function findByTitle(userId, titleId) {
  return getDb()
    .prepare('SELECT season, episode, watched_at FROM episode_progress WHERE user_id = ? AND title_id = ? ORDER BY season, episode')
    .all(userId, titleId);
}

function setWatched(userId, titleId, pairs, watched) {
  const db = getDb();
  const insert = db.prepare('INSERT OR IGNORE INTO episode_progress (user_id, title_id, season, episode) VALUES (?, ?, ?, ?)');
  const remove = db.prepare('DELETE FROM episode_progress WHERE user_id = ? AND title_id = ? AND season = ? AND episode = ?');
  db.transaction(() => {
    pairs.forEach(([season, episode]) => (watched ? insert : remove).run(userId, titleId, season, episode));
  })();
}

/** Latest watched episode (by season, then episode) per series title of the user. */
function latestByTitle(userId) {
  return getDb().prepare(`
    SELECT title_id, season, MAX(episode) AS episode FROM episode_progress e
    WHERE user_id = ? AND season = (SELECT MAX(season) FROM episode_progress WHERE title_id = e.title_id)
    GROUP BY title_id
  `).all(userId);
}

module.exports = { findByTitle, setWatched, latestByTitle };
