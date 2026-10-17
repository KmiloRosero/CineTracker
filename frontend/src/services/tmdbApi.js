const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY  = import.meta.env.VITE_TMDB_API_KEY ?? '';

function parseYear(dateStr) {
  if (!dateStr) return null;
  const y = parseInt(dateStr.substring(0, 4), 10);
  return isNaN(y) ? null : y;
}

async function tmdbFetch(endpoint, params = {}) {
  if (!API_KEY) throw new Error('TMDB API key not set. Add VITE_TMDB_API_KEY to your .env file.');

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) throw new Error(data.status_message ?? `TMDB error ${res.status}`);
  return data;
}

function normalizeSearchResult(item) {
  const isMovie = item.media_type === 'movie';
  return {
    tmdb_id:        item.id,
    type:           isMovie ? 'movie' : 'series',
    title:          item.title ?? item.name ?? '(untitled)',
    original_title: item.original_title ?? item.original_name ?? null,
    overview:       item.overview ?? null,
    poster_path:    item.poster_path ?? null,
    backdrop_path:  item.backdrop_path ?? null,
    release_year:   parseYear(item.release_date ?? item.first_air_date),
    genres:         '',
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
    genres:         (item.genres ?? []).map((g) => g.name).join(', '),
    status:         'pending',
    rating:         null,
    notes:          null,
  };
}

export async function searchTitle(query) {
  if (!query?.trim()) return [];
  const data = await tmdbFetch('/search/multi', { query, include_adult: false, page: 1 });
  return (data.results ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 8)
    .map(normalizeSearchResult);
}

/** Movies and series trending this week, normalized like search results. */
export async function getTrending(limit = 12) {
  const data = await tmdbFetch('/trending/all/week');
  return (data.results ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, limit)
    .map(normalizeSearchResult);
}

export async function getTitleDetails(tmdbId, type) {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const data = await tmdbFetch(endpoint);
  return normalizeDetails(data, type);
}

/** Maps a TMDB detail object to the shape `electronAPI.addTitle` expects. */
export function toCatalogPayload(detail) {
  const genres = typeof detail.genres === 'string'
    ? detail.genres.split(',').map((g) => g.trim()).filter(Boolean)
    : (Array.isArray(detail.genres) ? detail.genres : []);
  return {
    tmdb_id:        detail.tmdb_id        ?? null,
    type:           detail.type,
    title:          detail.title,
    original_title: detail.original_title ?? null,
    overview:       detail.overview       ?? null,
    poster_path:    detail.poster_path    ?? null,
    backdrop_path:  detail.backdrop_path  ?? null,
    release_year:   detail.release_year   ?? null,
    runtime:        detail.runtime        ?? null,
    genres:         JSON.stringify(genres),
    status:         'pending',
    rating:         null,
    notes:          null,
  };
}
