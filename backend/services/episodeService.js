const episodeRepository = require('../repositories/episodeRepository.js');
const titleRepository   = require('../repositories/titleRepository.js');
const { requireTitle }  = require('./titleService.js');
const { mapLimit }      = require('./platformService.js');
const tmdbService       = require('./tmdbService.js');

// Episode by episode progress for series, and the "Nuevos episodios" alert:
// series the person follows whose latest aired episode is one they have not
// marked yet, or whose next one airs soon.

const MAX_FOLLOWED = 40;
const CONCURRENCY  = 5;
const NEW_DAYS     = 30;
const SOON_DAYS    = 14;
const MAX_BATCH    = 200;

const today = () => new Date().toISOString().slice(0, 10);

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function requireSeries(userId, titleId) {
  const title = requireTitle(userId, titleId);
  if (title.type !== 'series') throw new Error('Solo las series tienen episodios.');
  return title;
}

function validPair(season, episode) {
  return Number.isInteger(season) && season >= 0 && season <= 500 && Number.isInteger(episode) && episode >= 1 && episode <= 5000;
}

/** How many episodes of each season have aired, from TMDB's season list and last aired episode. */
function airedPerSeason(status) {
  const last = status.lastEpisode;
  return status.seasons.map((s) => {
    let aired = 0;
    if (last && s.number < last.season) aired = s.episode_count ?? 0;
    else if (last && s.number === last.season) aired = last.episode;
    else if (!last && !s.upcoming) aired = s.episode_count ?? 0;
    return { ...s, aired };
  });
}

function compare(a, b) {
  return a.season - b.season || a.episode - b.episode;
}

/**
 * Progress on one series: { seasons: [{ number, name, episode_count, aired,
 * watched, air_date, upcoming }], watched: [{ season, episode, watched_at }],
 * totals: { aired, watched }, next: { season, episode } | null, status,
 * nextAiring }. Season data comes from TMDB; without it only `watched` is filled.
 */
async function getTracker(userId, titleId, { tmdb = tmdbService } = {}) {
  const title = requireSeries(userId, titleId);
  const watched = episodeRepository.findByTitle(userId, title.id);
  if (title.tmdb_id == null) {
    return { seasons: [], watched, totals: { aired: null, watched: watched.length }, next: null, status: null, nextAiring: null };
  }
  const status = await tmdb.getSeriesStatus(title.tmdb_id);
  const seen = new Set(watched.map((w) => `${w.season}:${w.episode}`));
  const seasons = airedPerSeason(status).map((s) => ({
    ...s,
    watched: watched.filter((w) => w.season === s.number).length,
  }));

  // the next one to watch: the first aired episode not marked after the furthest one marked
  const furthest = [...watched].sort(compare).pop() ?? null;
  let next = null;
  for (const s of seasons) {
    for (let e = 1; e <= s.aired && !next; e++) {
      const here = { season: s.number, episode: e };
      if (!seen.has(`${s.number}:${e}`) && (!furthest || compare(here, furthest) > 0)) next = here;
    }
    if (next) break;
  }

  return {
    seasons,
    watched,
    totals: { aired: seasons.reduce((n, s) => n + s.aired, 0), watched: seasons.reduce((n, s) => n + Math.min(s.watched, s.aired || s.watched), 0) },
    next,
    status: status.status,
    nextAiring: status.nextEpisode,
  };
}

async function getSeason(userId, titleId, seasonNumber, { tmdb = tmdbService } = {}) {
  const title = requireSeries(userId, titleId);
  if (title.tmdb_id == null) throw new Error('Esta serie no viene de TMDB, así que no conocemos sus episodios.');
  return tmdb.getSeason(title.tmdb_id, seasonNumber);
}

/**
 * Marks (or unmarks) episodes: `episodes` = [{ season, episode }]. Marking
 * the first one moves a pending series to "watching".
 */
function setEpisodes(userId, titleId, episodes, watched = true) {
  const title = requireSeries(userId, titleId);
  if (!Array.isArray(episodes) || episodes.length === 0) throw new Error('No hay episodios para marcar.');
  if (episodes.length > MAX_BATCH) throw new Error(`Se pueden marcar como máximo ${MAX_BATCH} episodios a la vez.`);
  const pairs = episodes.map((e) => [Number(e?.season), Number(e?.episode)]);
  if (!pairs.every(([s, e]) => validPair(s, e))) throw new Error('Episodio no válido.');
  episodeRepository.setWatched(userId, title.id, pairs, watched !== false);
  let updated = title;
  if (watched !== false && title.status === 'pending') updated = titleRepository.update(userId, title.id, { status: 'watching' });
  return { title: updated, watched: episodeRepository.findByTitle(userId, title.id) };
}

/**
 * Series the person follows (watching, or completed and still running) with
 * an episode aired in the last NEW_DAYS days that they have not marked, or
 * one airing within SOON_DAYS. [{ title, kind: 'new' | 'soon', lastEpisode,
 * nextEpisode, latestWatched, behind }], new ones first, newest first.
 */
async function getNewEpisodes(userId, { tmdb = tmdbService } = {}) {
  const latest = new Map(episodeRepository.latestByTitle(userId).map((r) => [r.title_id, { season: r.season, episode: r.episode }]));
  const series = titleRepository.findAll(userId)
    .filter((t) => t.type === 'series' && t.tmdb_id != null && (t.status === 'watching' || t.status === 'completed'))
    .slice(0, MAX_FOLLOWED);
  const now = today();

  const found = await mapLimit(series, CONCURRENCY, async (t) => {
    let status;
    try { status = await tmdb.getSeriesStatus(t.tmdb_id); } catch { return null; }
    const last = status.lastEpisode;
    const mine = latest.get(t.id) ?? null;
    const age = last?.air_date ? daysBetween(last.air_date, now) : null;
    if (age !== null && age >= 0 && age <= NEW_DAYS && (!mine || compare(mine, last) < 0)) {
      const behind = mine && mine.season === last.season ? last.episode - mine.episode : null;
      return { title: t, kind: 'new', lastEpisode: last, nextEpisode: status.nextEpisode, latestWatched: mine, behind };
    }
    const next = status.nextEpisode;
    const wait = next?.air_date ? daysBetween(now, next.air_date) : null;
    if (wait !== null && wait >= 0 && wait <= SOON_DAYS) {
      return { title: t, kind: 'soon', lastEpisode: last, nextEpisode: next, latestWatched: mine, behind: null };
    }
    return null;
  });

  const dateOf = (f) => (f.kind === 'new' ? f.lastEpisode.air_date : f.nextEpisode.air_date);
  return found
    .filter(Boolean)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'new' ? -1 : 1;
      return a.kind === 'new' ? dateOf(b).localeCompare(dateOf(a)) : dateOf(a).localeCompare(dateOf(b));
    });
}

module.exports = { getTracker, getSeason, setEpisodes, getNewEpisodes, airedPerSeason };
