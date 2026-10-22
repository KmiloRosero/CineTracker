const { getDb } = require('../db/database.js');

// Yearly goals ("ver 50 películas este año") and weekly streaks. A title
// counts toward a year's goal once, when it was completed that year (a
// completed watch record, or the completion of a title without records).
// Streaks count weeks with any activity: a completed watch or an episode.

const KINDS = ['all', 'movie', 'series'];
const STRIP_WEEKS = 26;
const DAY = 86400000;

function validYear(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1900 || y > 2200) throw new Error('Año no válido.');
  return y;
}

/** Distinct titles of `kind` completed in `year`. */
function completedIn(userId, year, kind) {
  const typeFilter = kind === 'all' ? '' : 'AND t.type = @kind';
  return getDb().prepare(`
    SELECT COUNT(DISTINCT id) AS n FROM (
      SELECT t.id FROM records r JOIN titles t ON t.id = r.title_id
      WHERE r.user_id = @user AND r.status = 'completed' AND strftime('%Y', r.watched_date) = @year ${typeFilter}
      UNION ALL
      SELECT t.id FROM titles t
      WHERE t.user_id = @user AND t.status = 'completed' AND strftime('%Y', t.updated_at) = @year ${typeFilter}
        AND NOT EXISTS (SELECT 1 FROM records r WHERE r.title_id = t.id)
    )
  `).get({ user: userId, year: String(year), kind }).n;
}

function dayOfYear(now) {
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now - start) / DAY) + 1;
}

function daysInYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/**
 * The challenge for `year` with its progress and pace: { year, goal, kind,
 * progress, expected, ahead, projected, remaining, perWeek, done } or
 * { year, goal: null, progress } when there is none.
 */
function getChallenge(userId, year = new Date().getFullYear(), now = new Date()) {
  const y = validYear(year);
  const row = getDb().prepare('SELECT goal, kind FROM challenges WHERE user_id = ? AND year = ?').get(userId, y);
  if (!row) return { year: y, goal: null, kind: 'all', progress: completedIn(userId, y, 'all') };

  const progress = completedIn(userId, y, row.kind);
  const total = daysInYear(y);
  // a past year is over; a future one has not started
  const elapsed = y < now.getFullYear() ? total : y > now.getFullYear() ? 0 : dayOfYear(now);
  const expected = Math.round((row.goal * elapsed) / total);
  const remaining = Math.max(0, row.goal - progress);
  const weeksLeft = Math.max(1, (total - elapsed) / 7);
  return {
    year: y,
    goal: row.goal,
    kind: row.kind,
    progress,
    expected,
    ahead: progress - expected,
    projected: elapsed ? Math.round((progress / elapsed) * total) : 0,
    remaining,
    perWeek: remaining ? Math.round((remaining / weeksLeft) * 10) / 10 : 0,
    done: progress >= row.goal,
    over: elapsed >= total,
  };
}

function setChallenge(userId, { year = new Date().getFullYear(), goal, kind = 'all' } = {}) {
  const y = validYear(year);
  if (goal === null) {
    getDb().prepare('DELETE FROM challenges WHERE user_id = ? AND year = ?').run(userId, y);
    return getChallenge(userId, y);
  }
  const g = Number(goal);
  if (!Number.isInteger(g) || g < 1 || g > 1000) throw new Error('La meta debe ser un número entre 1 y 1000.');
  if (!KINDS.includes(kind)) throw new Error('Tipo de reto no válido.');
  getDb().prepare(`
    INSERT INTO challenges (user_id, year, goal, kind) VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, year) DO UPDATE SET goal = excluded.goal, kind = excluded.kind
  `).run(userId, y, g, kind);
  return getChallenge(userId, y);
}

function toDate(at) {
  return new Date(String(at).includes('T') ? at : `${String(at).replace(' ', 'T')}Z`);
}

/** Local Monday of a date, as a day number (days since the epoch, local calendar). */
function weekStart(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (local.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(local.getFullYear(), local.getMonth(), local.getDate() - offset);
  return Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()) / DAY;
}

function dayLabel(day) {
  return new Date(day * DAY).toISOString().slice(0, 10);
}

/**
 * Weekly streaks: { current, best, state: 'active' | 'at-risk' | 'none',
 * thisWeek, weeks: [{ start, n }] } where `weeks` are the last 26 weeks,
 * oldest first. A streak is "at risk" when last week counted but this week
 * has nothing yet.
 */
function getStreaks(userId, now = new Date()) {
  const db = getDb();
  const dates = [
    ...db.prepare("SELECT watched_date AS at FROM records WHERE user_id = ? AND status = 'completed'").all(userId),
    ...db.prepare(`
      SELECT updated_at AS at FROM titles t WHERE t.user_id = ? AND t.status = 'completed'
        AND NOT EXISTS (SELECT 1 FROM records r WHERE r.title_id = t.id)
    `).all(userId),
    ...db.prepare('SELECT watched_at AS at FROM episode_progress WHERE user_id = ?').all(userId),
  ].map((r) => toDate(r.at)).filter((d) => !Number.isNaN(d.getTime()));

  const perWeek = new Map();
  dates.forEach((d) => {
    const w = weekStart(d);
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  });

  const thisWeek = weekStart(now);
  const has = (w) => (perWeek.get(w) ?? 0) > 0;
  const runEndingAt = (w) => {
    let n = 0;
    while (has(w - n * 7)) n++;
    return n;
  };

  let current = 0;
  let state = 'none';
  if (has(thisWeek)) { current = runEndingAt(thisWeek); state = 'active'; }
  else if (has(thisWeek - 7)) { current = runEndingAt(thisWeek - 7); state = 'at-risk'; }

  const sorted = [...perWeek.keys()].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  sorted.forEach((w, i) => {
    run = i > 0 && w === sorted[i - 1] + 7 ? run + 1 : 1;
    best = Math.max(best, run);
  });

  const weeks = Array.from({ length: STRIP_WEEKS }, (_, i) => {
    const w = thisWeek - (STRIP_WEEKS - 1 - i) * 7;
    return { start: dayLabel(w), n: perWeek.get(w) ?? 0 };
  });
  return { current, best, state, thisWeek: perWeek.get(thisWeek) ?? 0, weeks };
}

module.exports = { getChallenge, setChallenge, getStreaks, weekStart };
