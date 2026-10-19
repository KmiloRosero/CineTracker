const { getEnv } = require('../utils/env.js');
const { validateId } = require('../utils/validators.js');
const { TMDB_GENRE_NAME } = require('../utils/genres.js');

// TMDB is called from the main process so the API key never reaches the
// renderer bundle and the renderer CSP can keep connect-src 'self'.
const BASE_URL   = 'https://api.themoviedb.org/3';
const TIMEOUT_MS = 8000;
const CAST_LIMIT = 10;
// Titles and synopses in Latin American Spanish; genres are stored by id (see genres.js).
const LANGUAGE   = 'es-MX';

function apiKey() {
  const key = getEnv('TMDB_API_KEY');
  if (!key) throw new Error('TMDB no está configurado. Agrega tu clave de TMDB en Perfil > Claves de API.');
  return key;
}

async function tmdbFetch(endpoint, params = {}, language = LANGUAGE) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', apiKey());
  url.searchParams.set('language', language);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new Error('No se pudo conectar con TMDB. Revisa tu conexión a internet.');
  }
  if (res.status === 401) throw new Error('TMDB rechazó la clave de la API. Revísala en Perfil > Claves de API.');
  if (res.status === 404) throw new Error('Ese título no se encontró en TMDB.');
  if (!res.ok) throw new Error(`TMDB no está disponible en este momento (error ${res.status}).`);
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
    title:          item.title ?? item.name ?? '(sin título)',
    original_title: item.original_title ?? item.original_name ?? null,
    overview:       item.overview ?? null,
    poster_path:    item.poster_path ?? null,
    backdrop_path:  item.backdrop_path ?? null,
    release_year:   parseYear(item.release_date ?? item.first_air_date),
    genres:         [],
  };
}

// Top-billed cast; series use aggregate credits so long-running casts are complete.
function normalizeCast(item) {
  const people = item.aggregate_credits?.cast ?? item.credits?.cast ?? [];
  return people
    .filter((p) => p && p.name)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, CAST_LIMIT)
    .map((p) => ({
      name: String(p.name).slice(0, 120),
      character: (p.character ?? p.roles?.[0]?.character ?? null)?.slice(0, 200) || null,
    }));
}

function normalizeDetails(item, type) {
  const isMovie = type === 'movie';
  return {
    tmdb_id:        item.id,
    type:           isMovie ? 'movie' : 'series',
    title:          item.title ?? item.name ?? '(sin título)',
    original_title: item.original_title ?? item.original_name ?? null,
    overview:       item.overview ?? null,
    poster_path:    item.poster_path ?? null,
    backdrop_path:  item.backdrop_path ?? null,
    release_year:   parseYear(item.release_date ?? item.first_air_date),
    runtime:        isMovie ? (item.runtime ?? null) : (item.episode_run_time?.[0] ?? null),
    genres:         (item.genres ?? []).map((g) => TMDB_GENRE_NAME[g.id] ?? g.name),
    cast:           normalizeCast(item),
  };
}

const isMovieOrTv = (r) => r.media_type === 'movie' || r.media_type === 'tv';

async function search(query) {
  if (typeof query !== 'string' || !query.trim()) return [];
  if (query.length > 200) throw new Error('El texto de búsqueda es demasiado largo.');
  const data = await tmdbFetch('/search/multi', { query: query.trim(), include_adult: false, page: 1 });
  return (data.results ?? []).filter(isMovieOrTv).slice(0, 8).map(normalizeSearchResult);
}

async function getDetails(tmdbId, type) {
  validateId(tmdbId, 'El id de TMDB');
  if (type !== 'movie' && type !== 'series') throw new Error('El tipo debe ser "movie" o "series".');
  const endpoint = type === 'movie' ? `/movie/${Number(tmdbId)}` : `/tv/${Number(tmdbId)}`;
  const credits = type === 'movie' ? 'credits' : 'aggregate_credits';
  const details = normalizeDetails(await tmdbFetch(endpoint, { append_to_response: credits }), type);
  // Not every title has a Spanish synopsis; fall back to the English one.
  if (!details.overview) {
    try {
      details.overview = (await tmdbFetch(endpoint, {}, 'en-US')).overview || null;
    } catch { /* keep it empty */ }
  }
  return details;
}

// ── Trailers ────────────────────────────────────────────────────────────────
// YouTube ids are 11 characters of [A-Za-z0-9_-]; anything else is not embedded.
const YOUTUBE_ID   = /^[A-Za-z0-9_-]{11}$/;
const TRAILER_TYPE = { Trailer: 0, Teaser: 1 };
const TRAILER_LANG = { es: 0, en: 1 };
const TRAILER_TTL  = 6 * 60 * 60 * 1000;
const trailerCache = new Map(); // "movie:123" -> { expires, trailer }

/** Best trailer first: trailers before teasers, Spanish before English, official, newest. */
function rankTrailers(videos) {
  const rank = (v) => [
    TRAILER_TYPE[v.type],
    TRAILER_LANG[v.iso_639_1] ?? 2,
    v.official ? 0 : 1,
    -(Date.parse(v.published_at ?? '') || 0),
  ];
  return videos
    .filter((v) => v && v.site === 'YouTube' && YOUTUBE_ID.test(v.key ?? '') && v.type in TRAILER_TYPE)
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
      return 0;
    });
}

/** The title's best YouTube trailer as { key, name, language, type }, or null when TMDB has none. */
async function getTrailer(tmdbId, type) {
  validateId(tmdbId, 'El id de TMDB');
  if (type !== 'movie' && type !== 'series') throw new Error('El tipo debe ser "movie" o "series".');
  const cacheKey = `${type}:${Number(tmdbId)}`;
  const cached = trailerCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.trailer;

  const endpoint = type === 'movie' ? `/movie/${Number(tmdbId)}/videos` : `/tv/${Number(tmdbId)}/videos`;
  const data = await tmdbFetch(endpoint, { include_video_language: 'es,en,null' });
  const best = rankTrailers(data.results ?? [])[0];
  const trailer = best
    ? { key: best.key, name: String(best.name ?? '').slice(0, 200), language: best.iso_639_1 ?? null, type: best.type }
    : null;
  trailerCache.set(cacheKey, { expires: Date.now() + TRAILER_TTL, trailer });
  return trailer;
}

/** Checks that the configured key works (Perfil > Claves de API). */
async function ping() {
  await tmdbFetch('/configuration');
  return { ok: true };
}

function clearTrailerCache() {
  trailerCache.clear();
}

async function getTrending(limit = 12) {
  const n = Math.min(Math.max(Number(limit) || 12, 1), 20);
  const data = await tmdbFetch('/trending/all/week');
  return (data.results ?? []).filter(isMovieOrTv).slice(0, n).map(normalizeSearchResult);
}

module.exports = { search, getDetails, getTrending, getTrailer, ping, clearTrailerCache, normalizeDetails, YOUTUBE_ID };
