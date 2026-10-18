// Images go through the main process's ctimg:// protocol, which caches each
// file on disk the first time it loads so the catalogue keeps its posters offline.
const SIZES = ['w92', 'w185', 'w342', 'w500', 'w780', 'w1280', 'original'];

/**
 * Builds an image URL from a TMDB path ("/abc.jpg"). Full URLs (manual entries)
 * pass through unchanged. Sizes: posters w92-w780, backdrops w780/w1280.
 */
export function tmdbImage(path, size = 'w342') {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const s = SIZES.includes(size) ? size : 'w342';
  return `ctimg://${s}/${path.replace(/^\//, '')}`;
}
