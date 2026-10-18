const IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Builds an image URL from a TMDB path ("/abc.jpg") or passes a full URL through.
 * Sizes: posters w185/w342/w500/w780, backdrops w780/w1280/original.
 */
export function tmdbImage(path, size = 'w342') {
  if (!path) return null;
  return path.startsWith('http') ? path : `${IMAGE_BASE}/${size}${path}`;
}
