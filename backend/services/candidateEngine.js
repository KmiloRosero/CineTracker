const tmdbService = require('./tmdbService.js');
const { mapLimit } = require('./platformService.js');
const { tmdbGenreId, genreLabel } = require('../utils/genres.js');

// Where every suggestion comes from: real TMDB titles gathered from several
// sources (titles the person named, recommendations of the titles they
// loved, /discover by topic and by quality on varied pages, and titles an
// AI proposed for the request), filtered for quality, scored for the
// request and the person's taste, pushed down when they were shown
// recently, and shuffled a little so asking again brings new options.

const LIGHT_GENRES = ['Comedy', 'Family', 'Animation', 'Kids'];
// left out unless asked for: TV specials and documentaries are rarely what "something to watch" means
const UNASKED_GENRES = ['TV Movie', 'Documentary'];
const LIGHT_ASKS = ['Comedy', 'Romance', 'Family', 'Animation'];
const DARK_GENRES = ['Crime', 'War', 'Horror', 'Thriller'];
const MEAN_SCORE = 6.8;       // TMDB-wide average used to weigh scores with few votes

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** TMDB score pulled toward the average when there are few votes (IMDb's weighted rating). */
function weightedRating(c) {
  const m = c.type === 'series' ? 100 : 300;
  const v = c.vote_count ?? 0;
  const r = c.vote_average ?? MEAN_SCORE;
  return Math.round((((v / (v + m)) * r) + ((m / (v + m)) * MEAN_SCORE)) * 100) / 100;
}

function ids(genres, type) {
  return [...new Set(genres.map((g) => tmdbGenreId(g, type)).filter(Boolean))];
}

/** Picks up to `n` items, the higher their weight the likelier, without repeats. */
function weightedSample(items, n, weight, random) {
  const pool = [...items];
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + Math.max(0.01, weight(x)), 0);
    let r = random() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= Math.max(0.01, weight(pool[i]));
      if (r <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/**
 * The filters a search applies, from the request (intent), a style and
 * Descubrir's modifiers: { type, genreParam, genres, styleGenres,
 * excludeGenres, keywordIds, yearFrom, yearTo, maxRuntime, minRuntime,
 * language, country, providers, obscure }.
 */
function buildFilters({ type, intent = {}, style = null, modifiers = [], providers = [], maxRuntime = null }) {
  const year = new Date().getFullYear();
  const excludeGenres = new Set(intent.excludeGenres ?? []);
  if (modifiers.includes('darker')) LIGHT_GENRES.forEach((g) => excludeGenres.add(g));
  const wanted = new Set([...(intent.genres ?? []), ...(style?.genres ?? [])]);
  UNASKED_GENRES.forEach((g) => { if (!wanted.has(g)) excludeGenres.add(g); });
  const styleGenres = style?.genres ?? [];
  // a style decides the genres; the request only adds to an open search
  let genreParam = null;
  if (styleGenres.length) {
    const join = style.kind === 'pair' ? ',' : '|';
    genreParam = ids(styleGenres, type).join(join) || null;
  } else if (intent.genres?.length) {
    genreParam = ids(intent.genres, type).join('|') || null;
  }
  let yearFrom = intent.yearFrom ?? null;
  let yearTo = intent.yearTo ?? null;
  if (modifiers.includes('recent')) { yearFrom = Math.max(yearFrom ?? 0, year - 4); }
  if (modifiers.includes('classic')) { yearTo = Math.min(yearTo ?? 9999, 1995); }
  if (style?.decade && !yearFrom && !yearTo) { yearFrom = style.decade; yearTo = style.decade + 9; }
  const runtimeCap = [maxRuntime, intent.maxRuntime, modifiers.includes('shorter') ? (type === 'movie' ? 100 : 35) : null]
    .filter(Boolean);
  return {
    type,
    genreParam,
    genres: intent.genres ?? [],
    softGenres: intent.softGenres ?? [],
    referenceGenres: (intent.referenceItems ?? []).flatMap((r) => r.genres ?? []),
    styleGenres,
    styleKind: style?.kind ?? null,
    excludeGenres: [...excludeGenres],
    keywordIds: intent.keywordIds ?? [],
    topicGenres: intent.topicGenres ?? [],
    yearFrom,
    yearTo,
    maxRuntime: runtimeCap.length ? Math.min(...runtimeCap) : null,
    minRuntime: intent.minRuntime ?? null,
    language: intent.language ?? null,
    country: intent.country ?? null,
    providers: modifiers.includes('platforms') || intent.platformsOnly ? providers : [],
    obscure: modifiers.includes('obscure'),
  };
}

function discoverParams(f, { sort, page, withKeywords = true }) {
  const isMovie = f.type === 'movie';
  const dateKey = isMovie ? 'primary_release_date' : 'first_air_date';
  const p = {
    page,
    sort_by: sort,
    [`${dateKey}.lte`]: f.yearTo ? `${f.yearTo}-12-31` : today(),
  };
  if (f.yearFrom) p[`${dateKey}.gte`] = `${f.yearFrom}-01-01`;
  if (f.genreParam) p.with_genres = f.genreParam;
  const without = [...ids(f.excludeGenres, f.type), ...(isMovie && f.excludeGenres.includes('TV Movie') ? [10770] : [])];
  if (without.length) p.without_genres = without.join(',');
  if (withKeywords && f.keywordIds.length) p.with_keywords = f.keywordIds.join('|');
  if (f.maxRuntime) p['with_runtime.lte'] = f.maxRuntime;
  if (f.minRuntime) p['with_runtime.gte'] = f.minRuntime;
  else if (f.maxRuntime && isMovie) p['with_runtime.gte'] = 60;
  if (f.language) p.with_original_language = f.language;
  if (f.country) p.with_origin_country = f.country;
  if (f.providers.length) {
    Object.assign(p, { with_watch_providers: f.providers.join('|'), watch_region: tmdbService.WATCH_REGION, with_watch_monetization_types: 'flatrate|free|ads' });
  }
  if (sort === 'vote_average.desc') {
    p['vote_count.gte'] = f.obscure ? (isMovie ? 60 : 25) : (isMovie ? 500 : 150);
    if (f.obscure) p['vote_count.lte'] = 1500;
  } else {
    p['vote_count.gte'] = f.obscure ? (isMovie ? 30 : 15) : (isMovie ? 150 : 50);
    if (f.obscure) p['vote_count.lte'] = 1500;
  }
  return p;
}

/** Filters that can be checked on any list item (recommendations come unfiltered). */
function fits(c, f) {
  if (c.type !== f.type) return false;
  if (f.yearFrom && (!c.release_year || c.release_year < f.yearFrom)) return false;
  if (f.yearTo && c.release_year && c.release_year > f.yearTo) return false;
  if (f.excludeGenres.some((g) => c.genres.includes(g))) return false;
  if (f.language && c.original_language && c.original_language !== f.language) return false;
  if (f.styleKind === 'genre' && !f.styleGenres.some((g) => c.genres.includes(g))) return false;
  if (f.styleKind === 'pair' && !f.styleGenres.every((g) => c.genres.includes(g))) return false;
  if (f.obscure && c.vote_count > 3000) return false;
  return true;
}

/**
 * Gathers and scores candidates. `sources` = { seeds: catalog titles to
 * expand ([{ id, tmdb_id, type, title, rating }]), references and
 * suggestions: TMDB items }. `context` = { exclude: Set of "type:id",
 * recent: Map "type:id" -> { days }, taste, random, tmdb, poolSize }.
 * Returns candidates, best first, each with `facts` explaining the score.
 */
async function findCandidates(filters, sources = {}, context = {}) {
  const tmdb = context.tmdb ?? tmdbService;
  const random = context.random ?? Math.random;
  const exclude = context.exclude ?? new Set();
  const recent = context.recent ?? new Map();
  const taste = context.taste ?? { favourites: [], dislikes: [] };
  const poolSize = context.poolSize ?? 40;
  const f = filters;

  const pool = new Map();
  const add = (c, fact) => {
    if (!c || c.type !== f.type) return;
    const key = `${c.type}:${c.tmdb_id}`;
    if (exclude.has(key)) return;
    const entry = pool.get(key) ?? { ...c, facts: { suggested: false, references: [], seeds: [], keyword: false, discover: false } };
    if (fact.suggested) entry.facts.suggested = true;
    if (fact.reference && !entry.facts.references.includes(fact.reference)) entry.facts.references.push(fact.reference);
    if (fact.referenceTopics) entry.facts.referenceTopics = true;
    if (fact.seed && !entry.facts.seeds.some((s) => s.id === fact.seed.id)) entry.facts.seeds.push(fact.seed);
    if (fact.keyword) entry.facts.keyword = true;
    if (fact.discover) entry.facts.discover = true;
    pool.set(key, entry);
  };

  // 1. titles proposed for the request (already verified on TMDB)
  (sources.suggestions ?? []).filter((c) => fits(c, f)).forEach((c) => add(c, { suggested: true }));

  // 2. "like X": titles that share X's own topics and genres (this search honours
  // runtime and every other filter), plus TMDB's recommendations for X
  const refs = sources.references ?? [];
  const runtimeBound = Boolean(f.maxRuntime || f.minRuntime || f.providers.length);
  await Promise.all(refs.map(async (r) => {
    const topics = tmdb.getKeywords ? (await tmdb.getKeywords(r.tmdb_id, r.type).catch(() => [])).slice(0, 8) : [];
    const like = {
      ...f,
      genreParam: f.genreParam ?? (ids(r.genres.slice(0, 2), f.type).join('|') || null),
      keywordIds: topics.length ? topics : f.keywordIds,
    };
    const found = await Promise.all([
      tmdb.discover(f.type, discoverParams(like, { sort: 'vote_average.desc', page: 1 })).catch(() => []),
      tmdb.discover(f.type, discoverParams(like, { sort: 'popularity.desc', page: 1 })).catch(() => []),
    ]);
    found.flat().filter((c) => c.tmdb_id !== r.tmdb_id && fits(c, f)).forEach((c) => add(c, { reference: r.title, referenceTopics: true }));
    if (!runtimeBound) {
      const recs = await tmdb.getTitleRecommendations(r.tmdb_id, r.type).catch(() => []);
      recs.filter((c) => fits(c, f) && c.genres.some((g) => r.genres.includes(g))).forEach((c) => add(c, { reference: r.title }));
    }
  }));

  // 3. what TMDB recommends after the titles they loved, a different handful each time
  if (!runtimeBound) {
    const seedPool = (sources.seeds ?? []).filter((s) => s.tmdb_id != null && s.type === f.type).slice(0, 10);
    const seeds = weightedSample(seedPool, Math.min(4, seedPool.length), (s) => (s.rating ?? 6) - 4, random);
    const seedLists = await Promise.all(seeds.map((s) => tmdb.getTitleRecommendations(s.tmdb_id, s.type).catch(() => [])));
    seedLists.forEach((list, i) => list.filter((c) => fits(c, f)).forEach((c) => add(c, { seed: { id: seeds[i].id, title: seeds[i].title, rating: seeds[i].rating } })));
  }

  // 4. /discover by popularity and by score, on a first page and a varying one
  const open = f.genreParam || f.keywordIds.length || f.language || f.country || f.yearFrom || f.yearTo || f.providers.length || refs.length === 0;
  if (open) {
    const pick = (from, to) => from + Math.floor(random() * (to - from + 1));
    const queries = [
      { sort: 'popularity.desc', page: 1 },
      { sort: 'popularity.desc', page: pick(2, 5) },
      { sort: 'vote_average.desc', page: 1 },
      { sort: 'vote_average.desc', page: pick(2, 4) },
    ];
    const run = (withKeywords) => Promise.all(queries.map((q) =>
      tmdb.discover(f.type, discoverParams(f, { ...q, withKeywords })).catch(() => [])));
    const results = await run(true);
    results.flat().filter((c) => fits(c, f)).forEach((c) => add(c, { discover: true, keyword: f.keywordIds.length > 0 }));
    // a narrow topic may return little: widen to the genres the topic lives in, never to anything
    if (f.keywordIds.length && pool.size < 15 && (f.genreParam || f.topicGenres.length)) {
      const wider = { ...f, genreParam: f.genreParam ?? ids(f.topicGenres, f.type).join('|') };
      const more = await Promise.all(queries.map((q) => tmdb.discover(f.type, discoverParams(wider, { ...q, withKeywords: false })).catch(() => [])));
      more.flat().filter((c) => fits(c, f)).forEach((c) => add(c, { discover: true }));
    }
  }

  const favourites = new Set(taste.favourites ?? []);
  const asked = new Set(f.genres);
  const soft = new Set(f.softGenres);
  // genres that belong to the request one way or another: asked, of a title named, of the style
  const related = new Set([...f.genres, ...f.softGenres, ...f.referenceGenres, ...f.styleGenres, ...f.topicGenres]);
  const lightAsk = [...asked].some((g) => LIGHT_ASKS.includes(g)) && ![...asked].some((g) => DARK_GENRES.includes(g));
  const specific = related.size > 0;
  const topicAsked = f.keywordIds.length > 0;
  const dislikes = new Set((taste.dislikes ?? []).filter((g) => !asked.has(g)));
  const minVotes = f.obscure ? 15 : (f.type === 'movie' ? 40 : 15);

  const ranked = [...pool.values()]
    .filter((c) => c.poster_path && !c.adult && !c.upcoming && (c.readable || f.language))
    // a good score with enough votes: the weighted score alone would let a 5.8 with 60 votes through
    .filter((c) => c.facts.suggested || (c.vote_count >= minVotes && weightedRating(c) >= 6.1 && (c.vote_average ?? 0) >= 6.2))
    .map((c) => {
      const wr = weightedRating(c);
      // the first genre TMDB lists is the title's main one: a comedy first beats a crime film with a comic streak
      const mainGenre = asked.size && asked.has(c.genres[0]) ? 1.5 : 0;
      // a light request (comedy, romance, family) pushes down crime, war, horror and thrillers;
      // animation or family films only rise when they have to do with the request
      const darkness = lightAsk ? c.genres.filter((g) => DARK_GENRES.includes(g)).length * 1.2 : 0;
      const offTopic = specific ? c.genres.filter((g) => (g === 'Animation' || g === 'Family') && !related.has(g)).length * 1.5 : 0;
      const relevance = (c.facts.suggested ? 4 : 0) + c.facts.references.length * 2.5 + (c.facts.referenceTopics ? 1 : 0)
        + c.facts.seeds.length * (topicAsked ? 0.6 : 1.2) + c.genres.filter((g) => asked.has(g)).length + mainGenre
        + c.genres.filter((g) => soft.has(g)).length * 0.8 + (c.facts.keyword ? (topicAsked && f.styleGenres.length ? 3 : 1.5) : 0)
        - darkness - offTopic
        + (f.styleGenres.length ? c.genres.filter((g) => f.styleGenres.includes(g)).length * 0.5 : 0);
      const tasteFit = c.genres.filter((g) => favourites.has(g)).length * 0.4 - c.genres.filter((g) => dislikes.has(g)).length * 2;
      const shown = recent.get(`${c.type}:${c.tmdb_id}`);
      const history = !shown ? 0 : shown.days < 2 ? -6 : shown.days < 7 ? -3 : -1;
      const score = relevance + (wr - MEAN_SCORE) * 1.5 + tasteFit + history + random() * 1.2;
      return { ...c, weighted: wr, facts: { ...c.facts, shownDaysAgo: shown ? Math.round(shown.days) : null }, _score: Math.round(score * 100) / 100 };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, poolSize);

  // a title TMDB has not translated ("알포인트") is shown by its English name
  // one title per saga: "Gabriel's Inferno", "Part II" and "Part III" are one option
  const sagas = new Set();
  const varied = ranked.filter((c) => {
    const key = sagaKey(c.title);
    if (sagas.has(key)) return false;
    sagas.add(key);
    return true;
  });

  return mapLimit(varied, 6, async (c) => {
    if (LATIN.test(c.title)) return c;
    const english = tmdb.getEnglishTitle ? await tmdb.getEnglishTitle(c.tmdb_id, c.type).catch(() => null) : null;
    return english && LATIN.test(english) ? { ...c, title: english } : c;
  });
}

const LATIN = /[A-Za-zÀ-ÿ]/;

/** The part of a title shared by a saga: "Gabriel's Inferno: Part III" -> "gabriel's inferno". */
function sagaKey(title) {
  const full = String(title ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const base = full
    .split(/:| - | – /)[0]
    .replace(/\b(part|parte|capitulo|chapter|vol\.?|volumen)\b.*$/, '')
    .replace(/\b([ivx]+|\d+)\s*$/, '')
    .trim();
  // "1917" or "2001: odisea del espacio" have nothing left: they are their own saga
  return base || full;
}

function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

function formatScore(c) {
  if (c.vote_average == null || !c.vote_count) return null;
  return `${String(c.vote_average).replace('.', ',')} en TMDB con ${c.vote_count.toLocaleString('es-CO')} votos`;
}

/**
 * Why the rules picked a candidate, in one or two Spanish sentences, from
 * its facts and what was asked (`intent`).
 */
function ruleReason(c, intent = {}, taste = {}) {
  const sentences = [];
  if (c.facts.references.length) {
    sentences.push(`Se parece a ${joinNames(c.facts.references.map((t) => `“${t}”`))}, que mencionaste.`);
  } else if (c.facts.seeds.length) {
    const seeds = c.facts.seeds.slice(0, 2);
    const names = joinNames(seeds.map((s) => `“${s.title}”`));
    const ratings = seeds.filter((s) => s.rating != null).map((s) => String(s.rating));
    sentences.push(ratings.length === seeds.length
      ? `TMDB la recomienda a quien disfrutó ${names}, que calificaste con ${joinNames(ratings)}.`
      : `TMDB la recomienda a quien disfrutó ${names}, que está en tu catálogo.`);
  }
  const asked = [];
  const genres = c.genres.filter((g) => (intent.genres ?? []).includes(g)).map((g) => genreLabel(g).toLowerCase());
  if (genres.length) asked.push(`es de ${joinNames(genres)}`);
  if (c.facts.keyword && intent.topics?.length) asked.push(`trata de ${joinNames(intent.topics.map((t) => t.es))}`);
  if ((intent.yearFrom || intent.yearTo) && c.release_year) asked.push(`es de ${c.release_year}`);
  if (intent.placeLabel) asked.push(`es ${intent.placeLabel}`);
  if (asked.length) sentences.push(`${asked.join(', ').replace(/^./, (x) => x.toUpperCase())}, como pediste.`);
  if (sentences.length < 2) {
    const loved = c.genres.filter((g) => (taste.favourites ?? []).includes(g)).map((g) => genreLabel(g).toLowerCase());
    const score = formatScore(c);
    if (!sentences.length && loved.length) sentences.push(`Es de ${joinNames(loved)}, de tus géneros favoritos${score ? `, y tiene ${score}` : ''}.`);
    else if (score) sentences.push(`Tiene ${score}.`);
  }
  return sentences.slice(0, 2).join(' ') || 'Encaja con lo que buscas.';
}

/** One line per candidate for an AI prompt. */
function candidateLine(c, key) {
  const genres = c.genres.map(genreLabel).join(', ') || 'sin géneros';
  const score = c.vote_average != null ? `; TMDB ${c.vote_average} (${c.vote_count} votos)` : '';
  const why = [
    c.facts.suggested ? 'propuesta para el pedido' : null,
    c.facts.references.length ? `parecida a ${c.facts.references.map((t) => `"${t}"`).join(', ')}` : null,
    c.facts.seeds.length ? `recomendada a quien vio ${c.facts.seeds.map((s) => `"${s.title}"`).join(', ')}` : null,
    c.facts.keyword ? 'coincide con los temas pedidos' : null,
    c.facts.shownDaysAgo != null ? `ya se le sugirió hace ${c.facts.shownDaysAgo} días` : null,
  ].filter(Boolean).join('; ');
  const synopsis = c.overview ? ` — ${c.overview.slice(0, 200)}${c.overview.length > 200 ? '…' : ''}` : '';
  return `- ${key}: "${c.title}" (${c.type === 'series' ? 'serie' : 'película'}, ${c.release_year ?? 'año desconocido'}; ${genres}${score})${why ? ` [${why}]` : ''}${synopsis}`;
}

module.exports = {
  findCandidates, buildFilters, discoverParams, weightedRating, weightedSample, ruleReason, candidateLine, joinNames, sagaKey,
};
