// TMDB requests run in the main process (backend/services/tmdbService.js);
// these wrappers only turn `{ error }` IPC results into thrown errors.

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

export async function searchTitle(query) {
  if (!query?.trim()) return [];
  return unwrap(await window.electronAPI.tmdbSearch(query));
}

/** Movies and series trending this week. */
export async function getTrending(limit = 12) {
  return unwrap(await window.electronAPI.tmdbGetTrending(limit));
}

export async function getTitleDetails(tmdbId, type) {
  return unwrap(await window.electronAPI.tmdbGetDetails(tmdbId, type));
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
