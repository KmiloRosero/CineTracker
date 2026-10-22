const { getDb }        = require('../db/database.js');
const titleRepository  = require('../repositories/titleRepository.js');
const recordRepository = require('../repositories/recordRepository.js');
const titleService     = require('./titleService.js');
const tmdbService      = require('./tmdbService.js');
const { parseCsvObjects, toCsv } = require('../utils/csv.js');
const { parseGenres }  = require('../utils/genres.js');
const { validateId }   = require('../utils/validators.js');

// Import from Letterboxd or IMDb exports (or a CineTracker CSV) and export
// to CSV, including a file Letterboxd's importer reads. The renderer reads
// the file, asks for a preview, then sends the rows back in small batches
// so it can show progress; each row is matched on TMDB (exactly by TMDB or
// IMDb id when the file has one, otherwise by title and year).

const MAX_FILE_CHARS = 20 * 1024 * 1024;
const MAX_ROWS       = 5000;
const MAX_BATCH      = 25;

const FORMATS = {
  'letterboxd-diary':   'Diario de Letterboxd',
  'letterboxd-ratings': 'Calificaciones de Letterboxd',
  'letterboxd-list':    'Películas de Letterboxd',
  'imdb':               'Lista de IMDb',
  'cinetracker':        'Exportación de CineTracker',
};

// IMDb title types worth importing, and what they become.
const IMDB_TYPES = { movie: 'movie', tvMovie: 'movie', video: 'movie', short: 'movie', tvSeries: 'series', tvMiniSeries: 'series' };

function has(header, ...cols) {
  return cols.every((c) => header.includes(c));
}

function detectFormat(header) {
  if (has(header, 'tmdb_id', 'type', 'title', 'status')) return 'cinetracker';
  if (has(header, 'Const', 'Title', 'Title Type')) return 'imdb';
  if (has(header, 'Name', 'Year', 'Letterboxd URI')) {
    if (has(header, 'Watched Date')) return 'letterboxd-diary';
    if (has(header, 'Rating')) return 'letterboxd-ratings';
    return 'letterboxd-list';
  }
  return null;
}

function year(value) {
  const y = parseInt(String(value ?? '').slice(0, 4), 10);
  return Number.isInteger(y) && y > 1870 && y < 2200 ? y : null;
}

function isoDate(value) {
  const v = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  return Number.isNaN(Date.parse(v.slice(0, 10))) ? null : v.slice(0, 10);
}

function rating10(value, scale) {
  const n = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  const r = scale === 5 ? n * 2 : n;
  return Math.min(10, Math.max(1, Math.round(r * 10) / 10));
}

/** One import row in a single shape, whatever the source. */
function normalize(format, r, i, { listAs }) {
  const base = { key: i, title: '', year: null, type: null, imdbId: null, tmdbId: null, rating: null, status: 'completed', watchedDates: [], notes: null };
  if (format === 'cinetracker') {
    const tmdbId = Number(r.tmdb_id);
    return {
      ...base,
      title: r.title,
      year: year(r.year),
      type: r.type === 'series' ? 'series' : 'movie',
      tmdbId: Number.isInteger(tmdbId) && tmdbId > 0 ? tmdbId : null,
      rating: rating10(r.rating, 10),
      status: ['pending', 'watching', 'completed', 'dropped'].includes(r.status) ? r.status : 'pending',
      watchedDates: String(r.watched_dates ?? '').split(';').map(isoDate).filter(Boolean),
      notes: r.notes ? r.notes.slice(0, 2000) : null,
    };
  }
  if (format === 'imdb') {
    const type = IMDB_TYPES[r['Title Type']] ?? null;
    const rating = rating10(r['Your Rating'], 10);
    return {
      ...base,
      title: r.Title,
      year: year(r.Year),
      type,
      imdbId: /^tt\d+$/.test(r.Const) ? r.Const : null,
      rating,
      // a watchlist export has no rating: those are titles to watch
      status: rating ? 'completed' : 'pending',
      watchedDates: rating && isoDate(r['Date Rated']) ? [isoDate(r['Date Rated'])] : [],
      skip: type ? null : 'Solo se importan películas y series, no episodios sueltos.',
    };
  }
  // Letterboxd: films only
  const watched = format === 'letterboxd-diary' ? isoDate(r['Watched Date']) : null;
  const pending = format === 'letterboxd-list' && listAs === 'pending';
  return {
    ...base,
    title: r.Name,
    year: year(r.Year),
    type: 'movie',
    rating: rating10(r.Rating, 5),
    status: pending ? 'pending' : 'completed',
    watchedDates: watched ? [watched] : (!pending && format !== 'letterboxd-list' && isoDate(r.Date) ? [isoDate(r.Date)] : []),
  };
}

/** A diary has one row per watch: rows of the same film become one, with every date. */
function mergeRepeats(rows) {
  const byKey = new Map();
  rows.forEach((r) => {
    const key = `${r.imdbId ?? ''}|${r.tmdbId ?? ''}|${r.title.toLowerCase()}|${r.year ?? ''}|${r.type ?? ''}`;
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, { ...r }); return; }
    prev.watchedDates = [...new Set([...prev.watchedDates, ...r.watchedDates])].sort();
    prev.rating = r.rating ?? prev.rating; // the latest entry's rating wins
  });
  return [...byKey.values()].map((r, i) => ({ ...r, key: i }));
}

/**
 * Reads an export: { format, label, ambiguous, rows, skipped, total }.
 * `ambiguous` is true for a plain Letterboxd film list (watched.csv and
 * watchlist.csv look the same): `listAs` = 'completed' | 'pending' decides;
 * a file named like a watchlist defaults to pending.
 */
function preview(text, { fileName = '', listAs } = {}) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('El archivo está vacío.');
  if (text.length > MAX_FILE_CHARS) throw new Error('El archivo es demasiado grande (máximo 20 MB).');
  const { header, records } = parseCsvObjects(text);
  const format = detectFormat(header);
  if (!format) {
    throw new Error('No reconocemos este archivo. Usa la exportación de Letterboxd (diary.csv, ratings.csv, watched.csv o watchlist.csv), la de IMDb (ratings.csv o watchlist.csv) o una de CineTracker.');
  }
  if (records.length > MAX_ROWS) throw new Error(`El archivo tiene más de ${MAX_ROWS} filas.`);
  const ambiguous = format === 'letterboxd-list';
  const as = listAs ?? (/watchlist/i.test(fileName) ? 'pending' : 'completed');
  const all = records.map((r, i) => normalize(format, r, i, { listAs: as })).filter((r) => r.title);
  const skipped = all.filter((r) => r.skip);
  const rows = mergeRepeats(all.filter((r) => !r.skip));
  return { format, label: FORMATS[format], ambiguous, listAs: ambiguous ? as : null, rows, skipped: skipped.length, total: rows.length };
}

function sameTitle(a, b) {
  const clean = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  return clean(a) === clean(b);
}

/** The TMDB { tmdb_id, type } a row points to, or null. */
async function resolve(row, tmdb) {
  if (row.tmdbId) return { tmdb_id: row.tmdbId, type: row.type ?? 'movie' };
  if (row.imdbId) {
    const found = await tmdb.findByImdb(row.imdbId);
    if (found) return { tmdb_id: found.tmdb_id, type: found.type };
  }
  const types = row.type ? [row.type] : ['movie', 'series'];
  for (const type of types) {
    const results = await tmdb.searchTyped(row.title, type, row.year);
    // same name (in any language TMDB knows) and a year within one wins; else the top hit with the year
    const named = results.find((r) => (sameTitle(r.title, row.title) || sameTitle(r.original_title, row.title))
      && (!row.year || !r.release_year || Math.abs(r.release_year - row.year) <= 1));
    const pick = named ?? (row.year ? results.find((r) => r.release_year === row.year) : null);
    if (pick) return { tmdb_id: pick.tmdb_id, type };
  }
  return null;
}

function validRow(r) {
  return r && typeof r.title === 'string' && r.title.trim() && r.title.length <= 300
    && ['pending', 'watching', 'completed', 'dropped'].includes(r.status)
    && Array.isArray(r.watchedDates) && r.watchedDates.length <= 200 && r.watchedDates.every((d) => isoDate(d) === d)
    && (r.rating === null || (typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 10))
    && (r.type === null || r.type === 'movie' || r.type === 'series');
}

const STATUS_RANK = { pending: 0, watching: 1, dropped: 2, completed: 3 };

/** Adds the watches a title does not have yet (one record per new date). */
function addWatches(userId, title, dates, rating) {
  const have = new Set(recordRepository.findByTitleId(userId, title.id).map((r) => String(r.watched_date).slice(0, 10)));
  const fresh = dates.filter((d) => !have.has(d));
  fresh.forEach((d) => recordRepository.create(userId, { title_id: title.id, watched_date: `${d}T20:00:00.000Z`, rating, status: 'completed' }));
  return fresh.length;
}

/**
 * Imports up to MAX_BATCH preview rows. Existing titles only gain what they
 * lack (a rating, a later status, missing watch dates); nothing is
 * overwritten. Returns [{ key, title, outcome: 'added' | 'updated' |
 * 'unchanged' | 'not-found' | 'error', titleId?, message? }].
 */
async function importBatch(userId, rows, { tmdb = tmdbService } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No hay filas para importar.');
  if (rows.length > MAX_BATCH) throw new Error(`Se importan como máximo ${MAX_BATCH} filas a la vez.`);
  if (!rows.every(validRow)) throw new Error('Alguna fila del archivo no es válida.');

  const results = [];
  for (const row of rows) {
    const base = { key: row.key, title: row.title };
    try {
      const target = await resolve(row, tmdb);
      if (!target) { results.push({ ...base, outcome: 'not-found' }); continue; }
      validateId(target.tmdb_id, 'El id de TMDB');
      const existing = titleRepository.findByTmdbId(userId, target.tmdb_id);
      if (existing) {
        const changes = {};
        if (existing.rating == null && row.rating != null) changes.rating = row.rating;
        if (STATUS_RANK[row.status] > STATUS_RANK[existing.status]) changes.status = row.status;
        if (!existing.notes && row.notes) changes.notes = row.notes;
        const title = Object.keys(changes).length ? titleRepository.update(userId, existing.id, changes) : existing;
        const watches = addWatches(userId, title, row.watchedDates, row.rating);
        const changed = Object.keys(changes).length > 0 || watches > 0;
        results.push({ ...base, outcome: changed ? 'updated' : 'unchanged', titleId: title.id });
        continue;
      }
      const { title } = await titleService.ensureFromTmdb(userId, target.tmdb_id, target.type, {
        status: row.status, rating: row.rating, notes: row.notes ?? null,
      }, tmdb);
      addWatches(userId, title, row.watchedDates, row.rating);
      results.push({ ...base, outcome: 'added', titleId: title.id });
    } catch (err) {
      results.push({ ...base, outcome: 'error', message: err?.message ?? 'Error' });
    }
  }
  return results;
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Every title with its status, rating, watch dates and notes: a full backup that imports back. */
function exportCineTracker(userId) {
  const titles = titleRepository.findAll(userId);
  const dates = new Map();
  getDb().prepare('SELECT title_id, watched_date FROM records WHERE user_id = ? ORDER BY watched_date').all(userId)
    .forEach((r) => dates.set(r.title_id, [...(dates.get(r.title_id) ?? []), String(r.watched_date).slice(0, 10)]));
  const rows = [
    ['tmdb_id', 'type', 'title', 'original_title', 'year', 'status', 'rating', 'watched_dates', 'genres', 'runtime', 'notes', 'added_at'],
    ...titles.map((t) => [
      t.tmdb_id ?? '', t.type, t.title, t.original_title ?? '', t.release_year ?? '', t.status, t.rating ?? '',
      (dates.get(t.id) ?? []).join(';'), parseGenres(t.genres).join(';'), t.runtime ?? '', t.notes ?? '', t.added_at,
    ]),
  ];
  return { fileName: `cinetracker-${stamp()}.csv`, content: toCsv(rows), count: titles.length };
}

/**
 * Watched movies in Letterboxd's import format (Title, Year, tmdbID,
 * WatchedDate, Rating10, Rewatch): one row per watch, or one undated row
 * for a completed film without records. Series are left out (Letterboxd is films only).
 */
function exportLetterboxd(userId) {
  const movies = titleRepository.findAll(userId).filter((t) => t.type === 'movie' && (t.status === 'completed' || t.status === 'watching'));
  const rows = [['Title', 'Year', 'tmdbID', 'WatchedDate', 'Rating10', 'Rewatch']];
  movies.forEach((t) => {
    const watches = recordRepository.findByTitleId(userId, t.id).filter((r) => r.status === 'completed').reverse();
    if (watches.length === 0) {
      rows.push([t.title, t.release_year ?? '', t.tmdb_id ?? '', '', t.rating ?? '', '']);
      return;
    }
    watches.forEach((r, i) => rows.push([
      t.title, t.release_year ?? '', t.tmdb_id ?? '', String(r.watched_date).slice(0, 10),
      r.rating ?? t.rating ?? '', i > 0 ? 'Yes' : '',
    ]));
  });
  return { fileName: `cinetracker-letterboxd-${stamp()}.csv`, content: toCsv(rows), count: movies.length };
}

module.exports = { preview, importBatch, exportCineTracker, exportLetterboxd, detectFormat, FORMATS, MAX_BATCH };
