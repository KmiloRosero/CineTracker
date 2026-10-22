const followRepository    = require('../repositories/followRepository.js');
const dismissedRepository = require('../repositories/dismissedRepository.js');
const tmdbService         = require('./tmdbService.js');
const { getTasteProfile, joinNames } = require('./tasteService.js');
const { mapLimit }        = require('./platformService.js');
const { genreLabel, tmdbGenreId, TMDB_GENRE_NAME } = require('../utils/genres.js');
const { validateId }      = require('../utils/validators.js');

// "Estrenos": what is coming from the people and genres the person follows.
// Genres they love most are followed automatically until they choose their own.

const MAX_PEOPLE      = 25;
const AUTO_GENRES     = 2;
const PER_GENRE       = 10;
const HORIZON_DAYS    = 365;
const CONCURRENCY     = 5;
const FOLLOWABLE_GENRES = Object.values(TMDB_GENRE_NAME).filter((g) => tmdbGenreId(g, 'movie'));

const ROLE = { director: 'dirige', creator: 'creó', writer: 'escribe', cast: 'actúa en' };

function addDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function getFollows(userId) {
  const all = followRepository.findAll(userId);
  return {
    people: all.filter((f) => f.kind === 'person').map((f) => ({ id: Number(f.ref), name: f.name, profile_path: f.image_path, role: f.role })),
    genres: all.filter((f) => f.kind === 'genre').map((f) => ({ genre: f.ref, label: genreLabel(f.ref) })),
  };
}

function follow(userId, { kind, id, name, profile_path, role, genre } = {}) {
  if (kind === 'person') {
    validateId(id, 'El id de la persona');
    if (typeof name !== 'string' || !name.trim()) throw new Error('Falta el nombre de la persona.');
    if (getFollows(userId).people.length >= MAX_PEOPLE) throw new Error(`Puedes seguir como máximo ${MAX_PEOPLE} personas.`);
    followRepository.add(userId, {
      kind, ref: String(Number(id)), name: name.trim().slice(0, 120),
      image_path: typeof profile_path === 'string' ? profile_path.slice(0, 200) : null,
      role: ROLE[role] ? role : null,
    });
  } else if (kind === 'genre') {
    if (!FOLLOWABLE_GENRES.includes(genre)) throw new Error('Género no válido.');
    followRepository.add(userId, { kind, ref: genre, name: genreLabel(genre) });
  } else {
    throw new Error('Solo se pueden seguir personas o géneros.');
  }
  return getFollows(userId);
}

function unfollow(userId, { kind, id, genre } = {}) {
  if (kind === 'person') followRepository.remove(userId, 'person', String(Number(id)));
  else if (kind === 'genre') followRepository.remove(userId, 'genre', String(genre));
  return getFollows(userId);
}

/**
 * Upcoming releases: { items: [candidate + { reasons: [text], people: [names] }],
 * follows, genres: [{ genre, label, auto }], followable }, soonest first.
 * `options.tmdb` for tests.
 */
async function getUpcoming(userId, { tmdb = tmdbService } = {}) {
  const follows = getFollows(userId);
  const autoGenres = follows.genres.length
    ? []
    : getTasteProfile(userId).favourites.filter((g) => FOLLOWABLE_GENRES.includes(g)).slice(0, AUTO_GENRES);
  const genres = [
    ...follows.genres.map((g) => ({ ...g, auto: false })),
    ...autoGenres.map((g) => ({ genre: g, label: genreLabel(g), auto: true })),
  ];
  const dismissed = new Set(dismissedRepository.findAll(userId).map((d) => `${d.type}:${d.tmdb_id}`));
  const horizon = addDays(HORIZON_DAYS);

  const items = new Map();
  const add = (c, reason, personName = null) => {
    const key = `${c.type}:${c.tmdb_id}`;
    if (dismissed.has(key) || c.adult || !c.release_date || c.release_date > horizon) return;
    const entry = items.get(key) ?? { ...c, reasons: [], people: [] };
    if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
    if (personName && !entry.people.includes(personName)) entry.people.push(personName);
    items.set(key, entry);
  };

  let failed = 0;
  await mapLimit(follows.people, CONCURRENCY, async (p) => {
    try {
      (await tmdb.getPersonUpcoming(p.id)).forEach((c) => {
        const verb = ROLE[c.role] ?? 'participa en';
        add(c, `${p.name} ${verb} ${c.type === 'movie' ? 'esta película' : 'esta serie'}.`, p.name);
      });
    } catch {
      failed += 1;
    }
  });

  await mapLimit(genres, CONCURRENCY, async (g) => {
    try {
      const found = await tmdb.discover('movie', {
        with_genres: String(tmdbGenreId(g.genre, 'movie')),
        'primary_release_date.gte': addDays(1),
        'primary_release_date.lte': horizon,
        sort_by: 'popularity.desc',
      });
      found
        .filter((c) => c.poster_path && c.readable)
        .slice(0, PER_GENRE)
        .forEach((c) => add(c, g.auto
          ? `Es de ${g.label.toLowerCase()}, uno de tus géneros favoritos.`
          : `Es de ${g.label.toLowerCase()}, un género que sigues.`));
    } catch {
      failed += 1;
    }
  });

  const list = [...items.values()]
    // titles from followed people first on the same day
    .sort((a, b) => a.release_date.localeCompare(b.release_date) || b.people.length - a.people.length);
  return {
    items: list.map((c) => ({ ...c, reason: c.people.length > 1 ? `${joinNames(c.people)} participan en ${c.type === 'movie' ? 'esta película' : 'esta serie'}.` : c.reasons.join(' ') })),
    follows,
    genres,
    followable: FOLLOWABLE_GENRES.map((g) => ({ genre: g, label: genreLabel(g) })).sort((a, b) => a.label.localeCompare(b.label, 'es')),
    failed,
  };
}

/** Credits of a title with whether each person is followed, for the title page. */
async function getTitlePeople(userId, tmdbId, type, { tmdb = tmdbService } = {}) {
  const credits = await tmdb.getCredits(tmdbId, type);
  const followed = new Set(getFollows(userId).people.map((p) => p.id));
  const mark = (p) => ({ ...p, followed: followed.has(p.id) });
  return { directors: credits.directors.map(mark), cast: credits.cast.map(mark) };
}

module.exports = { getFollows, follow, unfollow, getUpcoming, getTitlePeople, FOLLOWABLE_GENRES };
