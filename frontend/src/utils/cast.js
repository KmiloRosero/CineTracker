/** Parses the `cast_members` column (JSON array of { name, character }). */
export function parseCast(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m.name === 'string') : [];
  } catch {
    return [];
  }
}
