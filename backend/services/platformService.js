const platformRepository = require('../repositories/platformRepository.js');
const titleRepository    = require('../repositories/titleRepository.js');
const tmdbService        = require('./tmdbService.js');

// "Mis plataformas": the services a person pays for, and which of their
// titles are on them right now (TMDB / JustWatch data for Colombia).

const MAX_PLATFORMS   = 30;
const MAX_CHECKED     = 150;
const CONCURRENCY     = 6;
const CHECKED_STATUSES = new Set(['pending', 'watching']);
// subscription or free: what can be watched without paying again
const INCLUDED_GROUPS = ['flatrate', 'free'];

function getPlatforms(userId) {
  return platformRepository.findAll(userId);
}

/** Ids of the user's platforms, for TMDB filters. */
function getPlatformIds(userId) {
  return getPlatforms(userId).map((p) => p.id);
}

function setPlatforms(userId, platforms) {
  if (!Array.isArray(platforms)) throw new Error('Elige tus plataformas de la lista.');
  if (platforms.length > MAX_PLATFORMS) throw new Error(`Puedes elegir como máximo ${MAX_PLATFORMS} plataformas.`);
  const seen = new Set();
  const clean = platforms.map((p) => {
    if (!Number.isInteger(p?.id) || p.id < 1) throw new Error('Plataforma no válida.');
    if (typeof p.name !== 'string' || !p.name.trim()) throw new Error('Plataforma no válida.');
    return { id: p.id, name: p.name.trim().slice(0, 80), logo_path: typeof p.logo_path === 'string' ? p.logo_path.slice(0, 200) : null };
  }).filter((p) => !seen.has(p.id) && seen.add(p.id));
  platformRepository.replaceAll(userId, clean);
  return getPlatforms(userId);
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Which pending or in-progress titles are included in the user's
 * platforms: { platforms, available: { [titleId]: [{ id, name, logo_path }] },
 * checked, failed }. Titles without a TMDB id are not checked.
 */
async function getAvailability(userId, { tmdb = tmdbService } = {}) {
  const platforms = getPlatforms(userId);
  if (platforms.length === 0) return { platforms, available: {}, checked: 0, failed: 0 };
  const mine = new Map(platforms.map((p) => [p.id, p]));
  const titles = titleRepository.findAll(userId)
    .filter((t) => t.tmdb_id != null && CHECKED_STATUSES.has(t.status))
    .slice(0, MAX_CHECKED);

  let failed = 0;
  const available = {};
  await mapLimit(titles, CONCURRENCY, async (t) => {
    try {
      const { groups } = await tmdb.getWatchProviders(t.tmdb_id, t.type, t.title);
      const on = INCLUDED_GROUPS.flatMap((g) => groups[g] ?? []).filter((p) => mine.has(p.id));
      const unique = on.filter((p, i) => on.findIndex((q) => q.id === p.id) === i).map((p) => mine.get(p.id));
      if (unique.length) available[t.id] = unique;
    } catch {
      failed += 1;
    }
  });
  return { platforms, available, checked: titles.length, failed };
}

/**
 * Adds where each item can be watched (subscription or free, Colombia):
 * `providers` (up to 3, the user's own first) and `onMine` when one of them
 * is the user's. Items need tmdb_id and type; lookups that fail are skipped.
 */
async function attachProviders(items, mine = [], { tmdb = tmdbService } = {}) {
  const own = new Set(mine);
  return mapLimit(items, CONCURRENCY, async (item) => {
    if (item?.tmdb_id == null || (item.type !== 'movie' && item.type !== 'series')) return { ...item, providers: [], onMine: false };
    try {
      const { groups } = await tmdb.getWatchProviders(item.tmdb_id, item.type, item.title ?? '');
      const list = INCLUDED_GROUPS.flatMap((g) => groups[g] ?? []);
      const unique = list.filter((p, i) => list.findIndex((q) => q.id === p.id) === i)
        .sort((a, b) => Number(own.has(b.id)) - Number(own.has(a.id)))
        .slice(0, 3)
        .map((p) => ({ id: p.id, name: p.name, logo_path: p.logo_path ?? null, url: p.url ?? null }));
      return { ...item, providers: unique, onMine: unique.some((p) => own.has(p.id)) };
    } catch {
      return { ...item, providers: [], onMine: false };
    }
  });
}

module.exports = { getPlatforms, getPlatformIds, setPlatforms, getAvailability, attachProviders, mapLimit };
