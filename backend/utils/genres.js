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

module.exports = { parseGenres };
