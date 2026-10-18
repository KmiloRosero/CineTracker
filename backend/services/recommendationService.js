const titleRepository = require('../repositories/titleRepository.js');
const { canonicalGenres, genreLabel } = require('../utils/genres.js');

const MIN_RATING = 8;
const TOP_N = 5;

function buildGenreFrequency(titles) {
  const freq = {};
  titles.forEach((t) => {
    if (t.rating == null || Number(t.rating) < MIN_RATING) return;
    canonicalGenres(t.genres).forEach((g) => {
      freq[g] = (freq[g] || 0) + 1;
    });
  });
  return freq;
}

function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** One sentence saying which of the user's favourite genres a title shares. */
function explain(matchedGenres) {
  const top = matchedGenres.slice(0, 3).map(genreLabel);
  const noun = top.length === 1 ? 'un género que' : 'géneros que';
  return `Coincide con ${joinNames(top)}, ${noun} calificaste con ${MIN_RATING} o más.`;
}

function getRecommendations(userId) {
  const titles = titleRepository.findAll(userId);
  const freq = buildGenreFrequency(titles);

  if (Object.keys(freq).length === 0) {
    return { recommendations: [], reason: 'no-ratings' };
  }

  const pending = titles.filter((t) => t.status === 'pending');

  if (pending.length === 0) {
    return { recommendations: [], reason: 'no-pending' };
  }

  const scored = pending.map((t) => {
    const matched = canonicalGenres(t.genres).filter((g) => freq[g]);
    const score = matched.reduce((sum, g) => sum + freq[g], 0);
    return { ...t, _score: score, _matched: matched.sort((a, b) => freq[b] - freq[a]) };
  });

  const recommendations = scored
    .filter((t) => t._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, TOP_N)
    .map(({ _score, _matched, ...t }) => ({ ...t, explanation: explain(_matched) }));

  if (recommendations.length === 0) {
    return { recommendations: [], reason: 'no-match' };
  }

  return { recommendations, reason: 'ok' };
}

module.exports = { getRecommendations };
