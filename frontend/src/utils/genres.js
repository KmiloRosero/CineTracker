/** Parses the `genres` column (a JSON array string) into an array of names. */
export function parseGenres(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter((g) => typeof g === 'string' && g.trim()) : [];
  } catch {
    return [];
  }
}

// TMDB names TV genres differently from movie genres. Kept in step with
// backend/utils/genres.js so Catalog shows the same names Statistics counts.
const TV_TO_MOVIE = {
  'Sci-Fi & Fantasy':   ['Science Fiction', 'Fantasy'],
  'Action & Adventure': ['Action', 'Adventure'],
  'War & Politics':     ['War', 'Politics'],
  'Kids':               ['Family'],
};

/** Genres in one shared vocabulary for movies and series, without duplicates (display and filtering). */
export function canonicalGenres(raw) {
  const out = new Set();
  parseGenres(raw).forEach((g) => (TV_TO_MOVIE[g.trim()] ?? [g.trim()]).forEach((c) => out.add(c)));
  return [...out];
}

// Spanish display names for the stored (English TMDB) genre names.
// Kept in step with backend/utils/genres.js.
const GENRE_ES = {
  'Action': 'Acción', 'Adventure': 'Aventura', 'Animation': 'Animación', 'Comedy': 'Comedia',
  'Crime': 'Crimen', 'Documentary': 'Documental', 'Drama': 'Drama', 'Family': 'Familia',
  'Fantasy': 'Fantasía', 'History': 'Historia', 'Horror': 'Terror', 'Music': 'Música',
  'Mystery': 'Misterio', 'Romance': 'Romance', 'Science Fiction': 'Ciencia ficción',
  'TV Movie': 'Película de TV', 'Thriller': 'Suspenso', 'War': 'Bélica', 'Western': 'Western',
  'Politics': 'Política', 'News': 'Noticias', 'Reality': 'Reality', 'Soap': 'Telenovela',
  'Talk': 'Entrevistas', 'Kids': 'Infantil',
  'Action & Adventure': 'Acción y aventura', 'Sci-Fi & Fantasy': 'Ciencia ficción y fantasía',
  'War & Politics': 'Bélica y política',
};

/** Spanish name of a stored genre; hand-typed genres pass through unchanged. */
export function genreLabel(name) {
  return GENRE_ES[name] ?? name;
}

const GENRE_BY_LABEL = Object.fromEntries(
  Object.entries(GENRE_ES).map(([name, label]) => [label.toLocaleLowerCase('es'), name]),
);

/**
 * Stored name for a genre typed in a form: Spanish labels map back to the
 * TMDB name so hand-entered genres count with the rest; others pass through.
 */
export function genreKey(text) {
  const clean = text.trim();
  return GENRE_BY_LABEL[clean.toLocaleLowerCase('es')] ?? clean;
}
