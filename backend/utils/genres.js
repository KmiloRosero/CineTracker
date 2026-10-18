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

module.exports = { parseGenres, canonicalGenres };
