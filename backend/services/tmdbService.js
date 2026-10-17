const { getEnv } = require('../utils/env.js');
const { validateId } = require('../utils/validators.js');

// TMDB is called from the main process so the API key never reaches the
// renderer bundle and the renderer CSP can keep connect-src 'self'.
const BASE_URL   = 'https://api.themoviedb.org/3';
const TIMEOUT_MS = 8000;

function apiKey() {
  const key = getEnv('TMDB_API_KEY');
  if (!key) throw new Error('TMDB is not configured. Add TMDB_API_KEY to backend/.env.');
  return key;
}

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', apiKey());
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new Error('Could not reach TMDB. Check your internet connection.');
  }
  if (res.status === 401) throw new Error('TMDB rejected the API key. Check TMDB_API_KEY in backend/.env.');
  if (res.status === 404) throw new Error('That title was not found on TMDB.');
  if (!res.ok) throw new Error(`TMDB is unavailable right now (error ${res.status}).`);
  return res.json();
}

function parseYear(dateStr) {
  const y = parseInt(String(dateStr ?? '').substring(0, 4), 10);
  return Number.isNaN(y) ? null : y;
}

function normalizeSearchResult(item) {
  return {
    tmdb_id:        item.id,
    type:           item.media_type === 'movie' ? 'movie' : 'series',
    title:          item.title ?? item.name ?? '(untitled)',
    original_title: item.original_title ?? item.original_name ?? null,
    overview:       item.overview ?? null,
    poster_path:    item.poster_path ?? null,
    backdrop_path:  item.backdrop_path ?? null,
    release_year:   parseYear(item.release_date ?? item.first_air_date),
    genres:         [],
  };
}

function normalizeDetails(item, type) {
  const isMovie = type === 'movie';
  return {
    tmdb_id:        item.id,
    type:           isMovie ? 'movie' : 'series',
    title:          item.title ?? item.name ?? '(untitled)',
    original_title: item.original_title ?? item.original_name ?? null,
    overview:       item.overview ?? null,
    poster_path:    item.poster_path ?? null,
    backdrop_path:  item.backdrop_path ?? null,
    release_year:   parseYear(item.release_date ?? item.first_air_date),
    runtime:        isMovie ? (item.runtime ?? null) : (item.episode_run_time?.[0] ?? null),
    genres:         (item.genres ?? []).map((g) => g.name),
  };
}

const isMovieOrTv = (r) => r.media_type === 'movie' || r.media_type === 'tv';

async function search(query) {
  if (typeof query !== 'string' || !query.trim()) return [];
  if (query.length > 200) throw new Error('Search text is too long.');
  const data = await tmdbFetch('/search/multi', { query: query.trim(), include_adult: false, page: 1 });
  return (data.results ?? []).filter(isMovieOrTv).slice(0, 8).map(normalizeSearchResult);
}

async function getDetails(tmdbId, type) {
  validateId(tmdbId, 'TMDB id');
  if (type !== 'movie' && type !== 'series') throw new Error('Type must be "movie" or "series".');
  const endpoint = type === 'movie' ? `/movie/${Number(tmdbId)}` : `/tv/${Number(tmdbId)}`;
  return normalizeDetails(await tmdbFetch(endpoint), type);
}

async function getTrending(limit = 12) {
  const n = Math.min(Math.max(Number(limit) || 12, 1), 20);
  const data = await tmdbFetch('/trending/all/week');
  return (data.results ?? []).filter(isMovieOrTv).slice(0, n).map(normalizeSearchResult);
}

module.exports = { search, getDetails, getTrending };
