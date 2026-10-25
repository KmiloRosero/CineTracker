const titleRepository = require('../repositories/titleRepository.js');
const { canonicalGenres, genreLabel } = require('../utils/genres.js');

// What a person's catalog says about their taste. Every personalised feature
// (Descubrir lists, tonight's pick, the cinephile profile, title insights)
// starts from this one reading, so they agree with each other.

const WATCHED = new Set(['completed', 'watching', 'dropped']);
const MAX_STYLES      = 8;
const MIN_STYLE_TITLES = 2;
const SEEDS_PER_STYLE = 10; // a varying handful of these is expanded each time

/** Digest of the catalog fields that taste depends on; changes when a rating or status does. */
function catalogSignature(titles) {
  return titles.map((t) => `${t.id}:${t.status}:${t.rating ?? ''}:${t.updated_at}`).join('|');
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * How much a watched title says the person likes its genres: a 9 counts for
 * far more than a 6, an unrated watch counts a little, a dropped title barely.
 */
function weight(t) {
  if (t.rating != null) return Math.max(0, (t.rating - 4) / 4) ** 2;
  if (t.status === 'dropped') return 0.1;
  return 0.6;
}

/** Best-rated first, then the ones touched most recently. */
function byPreference(a, b) {
  return (b.rating ?? 0) - (a.rating ?? 0) || String(b.updated_at).localeCompare(String(a.updated_at));
}

function decadeOf(year) {
  return Number.isInteger(year) ? Math.floor(year / 10) * 10 : null;
}

function decadeLabel(decade) {
  return decade >= 2000 ? `los ${decade}` : `los ${String(decade).slice(2)}`;
}

function dominantType(titles) {
  const movies = titles.filter((t) => t.type === 'movie').length;
  return movies >= titles.length - movies ? 'movie' : 'series';
}

function genreStats(watched) {
  const stats = new Map();
  watched.forEach((t) => {
    canonicalGenres(t.genres).forEach((g) => {
      const s = stats.get(g) ?? { genre: g, watched: 0, rated: 0, total: 0, score: 0, dropped: 0, titles: [] };
      s.watched += 1;
      s.score += weight(t);
      if (t.status === 'dropped') s.dropped += 1;
      if (t.rating != null) { s.rated += 1; s.total += t.rating; }
      s.titles.push(t);
      stats.set(g, s);
    });
  });
  return [...stats.values()]
    .map(({ total, titles, ...s }) => ({
      ...s,
      label: genreLabel(s.genre),
      avgRating: s.rated ? round1(total / s.rated) : null,
      score: round1(s.score),
      titles: [...titles].sort(byPreference),
    }))
    .sort((a, b) => b.score - a.score || b.watched - a.watched || a.genre.localeCompare(b.genre));
}

function seedsOf(titles) {
  return titles
    .filter((t) => t.tmdb_id != null && t.status !== 'dropped' && (t.rating == null || t.rating >= 6))
    .slice(0, SEEDS_PER_STYLE);
}

function styleFrom({ id, kind, label, genres, titles, decade = null }) {
  const rated = titles.filter((t) => t.rating != null);
  return {
    id,
    kind,
    label,
    genres,
    decade,
    count: titles.length,
    avgRating: rated.length ? round1(rated.reduce((sum, t) => sum + t.rating, 0) / rated.length) : null,
    type: dominantType(titles),
    seeds: seedsOf(titles),
  };
}

/** Genre pairs that keep showing up together among the titles the person liked. */
function topPairs(liked, favourites) {
  const counts = new Map();
  liked.forEach((t) => {
    const gs = canonicalGenres(t.genres).filter((g) => favourites.includes(g)).sort();
    for (let i = 0; i < gs.length; i++) {
      for (let j = i + 1; j < gs.length; j++) {
        const key = `${gs[i]}|${gs[j]}`;
        const entry = counts.get(key) ?? { genres: [gs[i], gs[j]], titles: [] };
        entry.titles.push(t);
        counts.set(key, entry);
      }
    }
  });
  return [...counts.values()]
    .filter((p) => p.titles.length >= 3)
    .sort((a, b) => b.titles.length - a.titles.length)
    .slice(0, 2);
}

/**
 * The person's taste in numbers and words. `styles` are the lists Descubrir
 * can build: one per favourite genre, the genre pairs they keep coming back
 * to, a favourite decade, and a mix of everything they love.
 */
function getTasteProfile(userId) {
  const titles  = titleRepository.findAll(userId);
  const watched = titles.filter((t) => WATCHED.has(t.status));
  const rated   = titles.filter((t) => t.rating != null);
  const mean    = rated.length ? round1(rated.reduce((s, t) => s + t.rating, 0) / rated.length) : null;

  const genres = genreStats(watched);
  const favourites = genres
    .filter((g) => g.watched >= MIN_STYLE_TITLES && (g.avgRating == null || g.avgRating >= 6))
    .slice(0, 5);
  const dislikes = genres
    .filter((g) => (g.rated >= 2 && g.avgRating <= 5.5) || (g.dropped >= 2 && g.dropped >= g.watched / 2))
    .map((g) => g.genre);

  const decadeCounts = new Map();
  watched.forEach((t) => {
    const d = decadeOf(t.release_year);
    if (d != null) decadeCounts.set(d, [...(decadeCounts.get(d) ?? []), t]);
  });
  const decades = [...decadeCounts.entries()]
    .map(([decade, list]) => ({ decade, label: decadeLabel(decade), n: list.length, titles: list }))
    .sort((a, b) => b.n - a.n || b.decade - a.decade);

  const liked = watched.filter((t) => t.rating == null ? t.status === 'completed' : t.rating >= 7);
  const styles = [];
  const favouriteNames = favourites.map((g) => g.genre);

  if (watched.length >= MIN_STYLE_TITLES) {
    const mixTitles = [...(liked.length >= MIN_STYLE_TITLES ? liked : watched)].sort(byPreference);
    styles.push(styleFrom({ id: 'mix', kind: 'mix', label: 'Lo mejor de tu gusto', genres: favouriteNames.slice(0, 3), titles: mixTitles }));
  }
  favourites.forEach((g) => {
    styles.push(styleFrom({ id: `genre:${g.genre}`, kind: 'genre', label: g.label, genres: [g.genre], titles: g.titles }));
  });
  topPairs(liked, favouriteNames).forEach((p) => {
    styles.push(styleFrom({
      id: `pair:${p.genres.join('|')}`,
      kind: 'pair',
      label: joinNames(p.genres.map(genreLabel)),
      genres: p.genres,
      titles: [...p.titles].sort(byPreference),
    }));
  });
  const topDecade = decades[0];
  if (topDecade && topDecade.n >= 3 && topDecade.n >= watched.length * 0.3) {
    styles.push(styleFrom({
      id: `decade:${topDecade.decade}`,
      kind: 'decade',
      label: `Cine de ${topDecade.label}`,
      genres: favouriteNames.slice(0, 2),
      titles: [...topDecade.titles].sort(byPreference),
      decade: topDecade.decade,
    }));
  }

  const runtimes = watched.filter((t) => t.type === 'movie' && t.runtime).map((t) => t.runtime);

  return {
    signature: catalogSignature(titles),
    counts: {
      titles: titles.length,
      watched: watched.length,
      rated: rated.length,
      movies: watched.filter((t) => t.type === 'movie').length,
      series: watched.filter((t) => t.type === 'series').length,
      dropped: watched.filter((t) => t.status === 'dropped').length,
      pending: titles.filter((t) => t.status === 'pending').length,
    },
    mean,
    genres: genres.map(({ titles: _t, ...g }) => g),
    favourites: favouriteNames,
    dislikes,
    decades: decades.map(({ titles: _t, ...d }) => d),
    avgMovieRuntime: runtimes.length ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : null,
    topTitles: [...rated].sort(byPreference).slice(0, 12),
    lowTitles: [...rated].sort((a, b) => a.rating - b.rating).filter((t) => t.rating <= 6).slice(0, 5),
    styles: styles.slice(0, MAX_STYLES),
    titles,
  };
}

/** One line per title for prompts: "Heat" (película, 1995; Crimen, Drama): 9/10. */
function describeTitle(t, { withRating = true } = {}) {
  const genres = canonicalGenres(t.genres).map(genreLabel).join(', ') || 'géneros desconocidos';
  const kind = t.type === 'series' ? 'serie' : 'película';
  const rating = withRating && t.rating != null ? `: ${t.rating}/10` : '';
  return `"${t.title}" (${kind}, ${t.release_year ?? 'año desconocido'}; ${genres})${rating}`;
}

/** The taste reading as a compact block of text for an AI prompt. */
function tasteForPrompt(taste) {
  const genreLine = taste.genres.slice(0, 8)
    .map((g) => `${g.label} (${g.watched} vistos${g.avgRating != null ? `, media ${g.avgRating}` : ''})`)
    .join('; ');
  const lines = [
    `Títulos vistos: ${taste.counts.watched} (${taste.counts.movies} películas, ${taste.counts.series} series); nota media ${taste.mean ?? 'sin notas'}.`,
    `Géneros: ${genreLine || 'sin datos'}.`,
    taste.dislikes.length ? `Géneros que suele calificar mal o abandonar: ${taste.dislikes.map(genreLabel).join(', ')}.` : null,
    taste.decades.length ? `Décadas: ${taste.decades.slice(0, 4).map((d) => `${d.label} (${d.n})`).join(', ')}.` : null,
    'Mejor calificados:',
    ...taste.topTitles.slice(0, 12).map((t) => `- ${describeTitle(t)}`),
  ];
  if (taste.lowTitles.length) {
    lines.push('Peor calificados:', ...taste.lowTitles.map((t) => `- ${describeTitle(t)}`));
  }
  return lines.filter(Boolean).join('\n');
}

module.exports = {
  getTasteProfile, catalogSignature, describeTitle, tasteForPrompt, joinNames, WATCHED,
};
