/** Parses the `genres` column (a JSON array string) into a clean array of names. */
function parseGenres(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter((g) => typeof g === 'string' && g.trim()) : [];
  } catch {
    return [];
  }
}

// TMDB names TV genres differently from movie genres. Combined TV genres
// split into their movie counterparts so movies and series count together.
const TV_TO_MOVIE = {
  'Sci-Fi & Fantasy':   ['Science Fiction', 'Fantasy'],
  'Action & Adventure': ['Action', 'Adventure'],
  'War & Politics':     ['War', 'Politics'],
  'Kids':               ['Family'],
};

/** Genres of a title in one shared vocabulary for movies and series, without duplicates. */
function canonicalGenres(raw) {
  const out = new Set();
  parseGenres(raw).forEach((g) => (TV_TO_MOVIE[g.trim()] ?? [g.trim()]).forEach((c) => out.add(c)));
  return [...out];
}

// Genres are stored by their English TMDB name (stable across languages and
// matching existing data); TMDB's genre ids map back to that name whatever
// language the metadata was requested in.
const TMDB_GENRE_NAME = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

// Spanish display names. Kept in step with frontend/src/utils/genres.js.
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

/** Spanish name of a stored genre; unknown (hand-typed) genres pass through. */
function genreLabel(name) {
  return GENRE_ES[name] ?? name;
}

module.exports = { parseGenres, canonicalGenres, genreLabel, TMDB_GENRE_NAME };
