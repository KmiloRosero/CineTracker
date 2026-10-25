const { getEnv } = require('../utils/env.js');
const { validateId } = require('../utils/validators.js');
const { TMDB_GENRE_NAME, genresFromIds } = require('../utils/genres.js');

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

// ── What comes next: saga order, seasons, similar titles, upcoming releases ──
const RELATED_LIMIT = 9;
const RELATED_TTL   = 6 * 60 * 60 * 1000;
const relatedCache  = new Map(); // "movie:123" -> { expires, related }

const today = () => new Date().toISOString().slice(0, 10);

/** A movie or series from a list endpoint, with its full release date and whether it is still to come. */
function normalizeListItem(item, type) {
  const date = item.release_date ?? item.first_air_date ?? null;
  return {
    tmdb_id:       item.id,
    type,
    title:         item.title ?? item.name ?? '(sin título)',
    overview:      item.overview ?? null,
    poster_path:   item.poster_path ?? null,
    backdrop_path: item.backdrop_path ?? null,
    release_year:  parseYear(date),
    release_date:  date || null,
    upcoming:      !date || date > today(),
  };
}

/** Saga parts in release order; parts without a date go last. */
function orderParts(parts) {
  return [...parts].sort((a, b) => {
    if (!a.release_date) return b.release_date ? 1 : 0;
    if (!b.release_date) return -1;
    return a.release_date.localeCompare(b.release_date);
  });
}

function normalizeSeasons(item) {
  return (item.seasons ?? [])
    .filter((s) => s && s.season_number > 0) // season 0 holds specials
    .sort((a, b) => a.season_number - b.season_number)
    .map((s) => ({
      number:        s.season_number,
      name:          s.name ?? `Temporada ${s.season_number}`,
      episode_count: s.episode_count ?? null,
      air_date:      s.air_date || null,
      poster_path:   s.poster_path ?? null,
      upcoming:      !s.air_date || s.air_date > today(),
    }));
}

// Discover returns many untranslated foreign releases; keep the ones a
// Spanish-speaking viewer can read: Spanish or English originals, or a title
// TMDB has translated.
function readableInSpanish(r) {
  const title = r.title ?? r.name;
  const original = r.original_title ?? r.original_name;
  return ['es', 'en'].includes(r.original_language) || (title && original && title !== original);
}

/** Upcoming releases sharing the title's two main genres (one genre if that finds too few). */
async function findUpcoming(type, genreIds, excludeIds) {
  if (genreIds.length === 0) return [];
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const dateParam = type === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
  const query = (genres) => tmdbFetch(endpoint, {
    with_genres: genres.join(','),
    [dateParam]: today(),
    sort_by: 'popularity.desc',
    include_adult: false,
    page: 1,
  });
  let results = (await query(genreIds.slice(0, 2))).results ?? [];
  if (results.length < 4 && genreIds.length > 1) {
    const seen = new Set(results.map((r) => r.id));
    const wider = ((await query(genreIds.slice(0, 1))).results ?? []).filter((r) => !seen.has(r.id));
    results = [...results, ...wider];
  }
  return results
    .filter((r) => !excludeIds.has(r.id) && r.poster_path && readableInSpanish(r))
    .map((r) => normalizeListItem(r, type))
    .sort((a, b) => (a.release_date ?? '9999').localeCompare(b.release_date ?? '9999'))
    .slice(0, RELATED_LIMIT);
}

/**
 * Everything that follows a title: for a movie, its saga in release order
 * ({ name, parts }, with `current` marking this one); for a series, its
 * seasons and next episode; plus similar titles and upcoming releases in
 * the same genres. Each list is empty when TMDB has nothing for it.
 */
async function getRelated(tmdbId, type) {
  validateId(tmdbId, 'El id de TMDB');
  if (type !== 'movie' && type !== 'series') throw new Error('El tipo debe ser "movie" o "series".');
  const id = Number(tmdbId);
  const cacheKey = `${type}:${id}`;
  const cached = relatedCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.related;

  const isMovie = type === 'movie';
  const details = await tmdbFetch(isMovie ? `/movie/${id}` : `/tv/${id}`, { append_to_response: 'recommendations' });

  let collection = null;
  if (isMovie && details.belongs_to_collection?.id) {
    try {
      const data = await tmdbFetch(`/collection/${Number(details.belongs_to_collection.id)}`);
      const parts = orderParts((data.parts ?? []).map((p) => normalizeListItem(p, 'movie')))
        .map((p) => ({ ...p, current: p.tmdb_id === id }));
      if (parts.length > 1) collection = { name: data.name ?? details.belongs_to_collection.name, parts };
    } catch { /* the rest of the page still shows */ }
  }

  const sagaIds = new Set([id, ...(collection?.parts ?? []).map((p) => p.tmdb_id)]);
  const similar = (details.recommendations?.results ?? [])
    .filter((r) => !sagaIds.has(r.id) && (r.media_type === undefined || r.media_type === (isMovie ? 'movie' : 'tv')))
    .slice(0, RELATED_LIMIT)
    .map((r) => normalizeListItem(r, type));

  let upcoming = [];
  try {
    const exclude = new Set([...sagaIds, ...similar.map((s) => s.tmdb_id)]);
    upcoming = await findUpcoming(type, (details.genres ?? []).map((g) => g.id), exclude);
  } catch { /* optional */ }

  const next = details.next_episode_to_air;
  const related = {
    collection,
    seasons:     isMovie ? [] : normalizeSeasons(details),
    nextEpisode: !isMovie && next ? {
      season:   next.season_number,
      episode:  next.episode_number,
      name:     next.name ?? null,
      air_date: next.air_date ?? null,
    } : null,
    similar,
    upcoming,
  };
  relatedCache.set(cacheKey, { expires: Date.now() + RELATED_TTL, related });
  return related;
}

// ── Where to watch (legal providers, data from JustWatch via TMDB) ──────────
const WATCH_REGION = 'CO';
const watchCache   = new Map(); // "movie:123" -> { expires, providers }

// Search pages of the big services, so a provider opens on the title; any
// other provider opens TMDB's "where to watch" page, which links to it.
const PROVIDER_SEARCH = {
  8:   (q) => `https://www.netflix.com/search?q=${q}`,
  337: (q) => `https://www.disneyplus.com/search?q=${q}`,
  119: (q) => `https://www.primevideo.com/search?phrase=${q}`,
  10:  (q) => `https://www.primevideo.com/search?phrase=${q}`,
  2:   (q) => `https://tv.apple.com/search?term=${q}`,
  350: (q) => `https://tv.apple.com/search?term=${q}`,
  3:   (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
  192: (q) => `https://www.youtube.com/results?search_query=${q}`,
};

/**
 * Where the title can be watched legally in Colombia, grouped as included
 * in a subscription, free (with or without ads), rent and buy; each provider
 * carries a link. `link` is TMDB's page for the title; groups are empty when
 * nothing is listed.
 */
async function getWatchProviders(tmdbId, type, title = '') {
  validateId(tmdbId, 'El id de TMDB');
  if (type !== 'movie' && type !== 'series') throw new Error('El tipo debe ser "movie" o "series".');
  const id = Number(tmdbId);
  const cacheKey = `${type}:${id}`;
  const cached = watchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.providers;

  const data = await tmdbFetch(type === 'movie' ? `/movie/${id}/watch/providers` : `/tv/${id}/watch/providers`);
  const region = data.results?.[WATCH_REGION] ?? {};
  const link = typeof region.link === 'string' && region.link.startsWith('https://www.themoviedb.org/') ? region.link : null;
  const query = encodeURIComponent(String(title).slice(0, 200));

  const normalize = (list) => (Array.isArray(list) ? list : [])
    .filter((p) => p && Number.isInteger(p.provider_id) && p.provider_name)
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
    .map((p) => ({
      id:        p.provider_id,
      name:      String(p.provider_name).slice(0, 80),
      logo_path: p.logo_path ?? null,
      url:       PROVIDER_SEARCH[p.provider_id] && query ? PROVIDER_SEARCH[p.provider_id](query) : link,
    }));
  const unique = (list) => list.filter((p, i) => list.findIndex((q) => q.id === p.id) === i);

  const providers = {
    region: WATCH_REGION,
    link,
    groups: {
      flatrate: normalize(region.flatrate),
      free:     unique([...normalize(region.free), ...normalize(region.ads)]),
      rent:     normalize(region.rent),
      buy:      normalize(region.buy),
    },
  };
  watchCache.set(cacheKey, { expires: Date.now() + TRAILER_TTL, providers });
  return providers;
}

// ── Discovery candidates ─────────────────────────────────────────────────────
// Titles that are not in the catalog yet, with what ranking and the AI need:
// genres (stored names), TMDB score and votes. Lists are cached for a while
// because the same seeds and filters are asked for again on every refresh.
const LIST_TTL  = 6 * 60 * 60 * 1000;
const listCache = new Map(); // url-ish key -> { expires, items }

function normalizeCandidate(item, type) {
  return {
    ...normalizeListItem(item, type),
    original_title:    item.original_title ?? item.original_name ?? null,
    original_language: item.original_language ?? null,
    genres:            genresFromIds(item.genre_ids ?? (item.genres ?? []).map((g) => g.id)),
    vote_average:      typeof item.vote_average === 'number' ? Math.round(item.vote_average * 10) / 10 : null,
    vote_count:        Number.isInteger(item.vote_count) ? item.vote_count : 0,
    popularity:        typeof item.popularity === 'number' ? item.popularity : 0,
    adult:             item.adult === true,
    readable:          readableInSpanish(item),
  };
}

async function cachedList(key, load) {
  const hit = listCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.items;
  const items = await load();
  listCache.set(key, { expires: Date.now() + LIST_TTL, items });
  return items;
}

function requireType(type) {
  if (type !== 'movie' && type !== 'series') throw new Error('El tipo debe ser "movie" o "series".');
}

/** TMDB's "if you liked this" list for a title (first page), as candidates. */
async function getTitleRecommendations(tmdbId, type) {
  validateId(tmdbId, 'El id de TMDB');
  requireType(type);
  const endpoint = type === 'movie' ? `/movie/${Number(tmdbId)}/recommendations` : `/tv/${Number(tmdbId)}/recommendations`;
  return cachedList(`rec:${endpoint}`, async () => {
    const data = await tmdbFetch(endpoint, { page: 1 });
    return (data.results ?? []).map((r) => normalizeCandidate(r, type));
  });
}

/** The keyword ids TMDB gives a title (its topics: "space travel", "wormhole"…), most specific first. */
async function getKeywords(tmdbId, type) {
  validateId(tmdbId, 'El id de TMDB');
  requireType(type);
  const endpoint = type === 'movie' ? `/movie/${Number(tmdbId)}/keywords` : `/tv/${Number(tmdbId)}/keywords`;
  return cachedList(`kw:${endpoint}`, async () => {
    const data = await tmdbFetch(endpoint, {}, 'en-US');
    return (data.keywords ?? data.results ?? []).filter((k) => Number.isInteger(k?.id)).map((k) => k.id);
  });
}

// Discover filters the caller may set; anything else is dropped.
const DISCOVER_PARAMS = new Set([
  'with_genres', 'without_genres', 'sort_by', 'vote_count.gte', 'vote_count.lte', 'vote_average.gte',
  'with_runtime.gte', 'with_runtime.lte', 'primary_release_date.gte', 'primary_release_date.lte',
  'first_air_date.gte', 'first_air_date.lte', 'with_watch_providers', 'with_watch_monetization_types',
  'watch_region', 'with_original_language', 'with_origin_country', 'with_keywords', 'without_keywords', 'page',
]);

/** /discover for movies or series with the given filters, as candidates. */
async function discover(type, params = {}) {
  requireType(type);
  const clean = Object.fromEntries(Object.entries(params)
    .filter(([k, v]) => DISCOVER_PARAMS.has(k) && v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b)));
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  return cachedList(`discover:${endpoint}?${new URLSearchParams(clean)}`, async () => {
    const data = await tmdbFetch(endpoint, { include_adult: false, page: 1, ...clean });
    return (data.results ?? []).map((r) => normalizeCandidate(r, type));
  });
}

/**
 * The TMDB keyword id for an English topic ("heist", "time travel"), or null.
 * Ids are looked up, never hardcoded: TMDB keywords are a living list.
 */
async function searchKeyword(topic) {
  if (typeof topic !== 'string' || !topic.trim()) return null;
  const query = topic.trim().toLowerCase().slice(0, 60);
  const items = await cachedList(`keyword:${query}`, async () => {
    const data = await tmdbFetch('/search/keyword', { query, page: 1 }, 'en-US');
    return (data.results ?? []).filter((k) => Number.isInteger(k?.id) && k.name).map((k) => ({ id: k.id, name: String(k.name).toLowerCase() }));
  });
  const exact = items.find((k) => k.name === query);
  return (exact ?? items[0])?.id ?? null;
}

/** The English title of a movie or series, for titles TMDB has not translated to Spanish. */
async function getEnglishTitle(tmdbId, type) {
  validateId(tmdbId, 'El id de TMDB');
  requireType(type);
  const endpoint = type === 'movie' ? `/movie/${Number(tmdbId)}` : `/tv/${Number(tmdbId)}`;
  const [hit] = await cachedList(`en-title:${endpoint}`, async () => {
    const data = await tmdbFetch(endpoint, {}, 'en-US');
    return [data.title ?? data.name ?? null];
  });
  return hit;
}

/** Search one kind of title by name, optionally by year, as candidates. */
async function searchTyped(query, type, year = null) {
  requireType(type);
  if (typeof query !== 'string' || !query.trim()) return [];
  const isMovie = type === 'movie';
  const params = { query: query.trim().slice(0, 200), include_adult: false, page: 1 };
  if (Number.isInteger(year)) params[isMovie ? 'primary_release_year' : 'first_air_date_year'] = year;
  const data = await tmdbFetch(isMovie ? '/search/movie' : '/search/tv', params);
  return (data.results ?? []).map((r) => normalizeCandidate(r, type));
}

// ── Episodes ─────────────────────────────────────────────────────────────────
const EPISODE_TTL  = 6 * 60 * 60 * 1000;
const episodeCache = new Map(); // "season:123:2" / "status:123" -> { expires, value }

async function cachedValue(key, load) {
  const hit = episodeCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  episodeCache.set(key, { expires: Date.now() + EPISODE_TTL, value });
  return value;
}

function normalizeEpisodeRef(e) {
  return e && Number.isInteger(e.season_number) && Number.isInteger(e.episode_number)
    ? { season: e.season_number, episode: e.episode_number, name: e.name ?? null, air_date: e.air_date || null }
    : null;
}

/** A season's episodes: { number, name, air_date, episodes: [{ number, name, overview, air_date, runtime, still_path, upcoming }] }. */
async function getSeason(tmdbId, seasonNumber) {
  validateId(tmdbId, 'El id de TMDB');
  const n = Number(seasonNumber);
  if (!Number.isInteger(n) || n < 0 || n > 500) throw new Error('Temporada no válida.');
  return cachedValue(`season:${Number(tmdbId)}:${n}`, async () => {
    const data = await tmdbFetch(`/tv/${Number(tmdbId)}/season/${n}`);
    return {
      number: n,
      name: data.name ?? `Temporada ${n}`,
      air_date: data.air_date || null,
      episodes: (data.episodes ?? [])
        .filter((e) => e && Number.isInteger(e.episode_number) && e.episode_number >= 1)
        .sort((a, b) => a.episode_number - b.episode_number)
        .map((e) => ({
          number:     e.episode_number,
          name:       e.name ?? `Episodio ${e.episode_number}`,
          overview:   e.overview ? String(e.overview).slice(0, 600) : null,
          air_date:   e.air_date || null,
          runtime:    Number.isInteger(e.runtime) ? e.runtime : null,
          still_path: e.still_path ?? null,
          upcoming:   !e.air_date || e.air_date > today(),
        })),
    };
  });
}

/** Where a series stands: { status, inProduction, seasons, lastEpisode, nextEpisode }. */
async function getSeriesStatus(tmdbId) {
  validateId(tmdbId, 'El id de TMDB');
  return cachedValue(`status:${Number(tmdbId)}`, async () => {
    const data = await tmdbFetch(`/tv/${Number(tmdbId)}`);
    return {
      status:       data.status ?? null,
      inProduction: data.in_production === true,
      seasons:      normalizeSeasons(data),
      lastEpisode:  normalizeEpisodeRef(data.last_episode_to_air),
      nextEpisode:  normalizeEpisodeRef(data.next_episode_to_air),
    };
  });
}

// ── People: credits and what they have coming ──────────────────────────────
const PEOPLE_TTL  = 12 * 60 * 60 * 1000;
const peopleCache = new Map();

async function cachedPeople(key, load) {
  const hit = peopleCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  peopleCache.set(key, { expires: Date.now() + PEOPLE_TTL, value });
  return value;
}

function person(p, role) {
  return { id: p.id, name: String(p.name).slice(0, 120), profile_path: p.profile_path ?? null, role };
}

/** Who made a title: { directors: [{ id, name, profile_path, role }], cast: [... with character] }. Series list their creators as directors. */
async function getCredits(tmdbId, type) {
  validateId(tmdbId, 'El id de TMDB');
  requireType(type);
  const id = Number(tmdbId);
  return cachedPeople(`credits:${type}:${id}`, async () => {
    const valid = (p) => p && Number.isInteger(p.id) && p.name;
    if (type === 'movie') {
      const data = await tmdbFetch(`/movie/${id}/credits`);
      const directors = (data.crew ?? []).filter((c) => valid(c) && c.job === 'Director').map((c) => person(c, 'director'));
      const cast = (data.cast ?? []).filter(valid).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).slice(0, CAST_LIMIT)
        .map((c) => ({ ...person(c, 'cast'), character: c.character ? String(c.character).slice(0, 200) : null }));
      return { directors: directors.filter((d, i) => directors.findIndex((x) => x.id === d.id) === i), cast };
    }
    const data = await tmdbFetch(`/tv/${id}`, { append_to_response: 'aggregate_credits' });
    const directors = (data.created_by ?? []).filter(valid).map((c) => person(c, 'creator'));
    const cast = (data.aggregate_credits?.cast ?? []).filter(valid).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).slice(0, CAST_LIMIT)
      .map((c) => ({ ...person(c, 'cast'), character: c.roles?.[0]?.character ? String(c.roles[0].character).slice(0, 200) : null }));
    return { directors, cast };
  });
}

const PERSON_JOBS = { Director: 'director', Creator: 'creator', Screenplay: 'writer', Writer: 'writer' };

/** A person's movies and series that are still to be released, with their role in each. */
async function getPersonUpcoming(personId) {
  validateId(personId, 'El id de la persona');
  return cachedPeople(`upcoming:${Number(personId)}`, async () => {
    const data = await tmdbFetch(`/person/${Number(personId)}/combined_credits`);
    const now = today();
    const items = new Map();
    const take = (c, role) => {
      if (!isMovieOrTv(c)) return;
      const type = c.media_type === 'movie' ? 'movie' : 'series';
      const date = c.release_date ?? c.first_air_date ?? null;
      if (!date || date <= now) return; // only dated, future releases
      const key = `${type}:${c.id}`;
      if (!items.has(key)) items.set(key, { ...normalizeCandidate(c, type), role });
    };
    (data.crew ?? []).forEach((c) => { if (PERSON_JOBS[c.job]) take(c, PERSON_JOBS[c.job]); });
    (data.cast ?? []).forEach((c) => take(c, 'cast'));
    return [...items.values()];
  });
}

/** The TMDB title for an IMDb id ("tt0113277"): { tmdb_id, type, title, release_year } or null. */
async function findByImdb(imdbId) {
  if (typeof imdbId !== 'string' || !/^tt\d{5,10}$/.test(imdbId)) throw new Error('Id de IMDb no válido.');
  const data = await tmdbFetch(`/find/${imdbId}`, { external_source: 'imdb_id' });
  const movie = data.movie_results?.[0];
  if (movie) return normalizeCandidate(movie, 'movie');
  const tv = data.tv_results?.[0];
  return tv ? normalizeCandidate(tv, 'series') : null;
}

// Streaming services available in the region, for "Mis plataformas".
const PROVIDERS_TTL = 24 * 60 * 60 * 1000;
let providerCatalog = null; // { expires, providers }

/** Movie and TV providers in Colombia, merged and ordered by TMDB's local priority. */
async function getProviderCatalog() {
  if (providerCatalog && providerCatalog.expires > Date.now()) return providerCatalog.providers;
  const lists = await Promise.all(['movie', 'tv'].map((kind) => tmdbFetch(`/watch/providers/${kind}`, { watch_region: WATCH_REGION })));
  const byId = new Map();
  lists.flatMap((l) => l.results ?? []).forEach((p) => {
    if (!p || !Number.isInteger(p.provider_id) || !p.provider_name) return;
    const priority = p.display_priorities?.[WATCH_REGION] ?? p.display_priority ?? 999;
    const prev = byId.get(p.provider_id);
    if (!prev || priority < prev.priority) {
      byId.set(p.provider_id, { id: p.provider_id, name: String(p.provider_name).slice(0, 80), logo_path: p.logo_path ?? null, priority });
    }
  });
  // add-on channels sold inside Amazon or Apple ("MGM Plus Amazon Channel") are left out
  const providers = [...byId.values()]
    .filter((p) => !/channel/i.test(p.name))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)).slice(0, 30)
    .map(({ priority, ...p }) => p);
  providerCatalog = { expires: Date.now() + PROVIDERS_TTL, providers };
  return providers;
}

/** Checks that the configured key works (Perfil > Claves de API). */
async function ping() {
  await tmdbFetch('/configuration');
  return { ok: true };
}

function clearTrailerCache() {
  providerCatalog = null;
  peopleCache.clear();
  episodeCache.clear();
  listCache.clear();
  trailerCache.clear();
  relatedCache.clear();
  watchCache.clear();
}

async function getTrending(limit = 12) {
  const n = Math.min(Math.max(Number(limit) || 12, 1), 20);
  const data = await tmdbFetch('/trending/all/week');
  return (data.results ?? []).filter(isMovieOrTv).slice(0, n).map(normalizeSearchResult);
}

module.exports = {
  search, searchTyped, searchKeyword, getEnglishTitle, getDetails, getTrending, getTrailer, getRelated, getWatchProviders,
  getTitleRecommendations, getKeywords, discover, getProviderCatalog, getSeason, getSeriesStatus, getCredits, getPersonUpcoming, findByImdb, ping, WATCH_REGION, clearTrailerCache, normalizeDetails, readableInSpanish, YOUTUBE_ID,
};
