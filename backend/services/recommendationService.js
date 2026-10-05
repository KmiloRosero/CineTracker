const titleRepository = require('../repositories/titleRepository.js');

const MIN_RATING = 8;
const TOP_N = 5;

function parseGenres(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function buildGenreFrequency(titles) {
  const freq = {};
  titles.forEach((t) => {
    if (t.rating == null || Number(t.rating) < MIN_RATING) return;
    parseGenres(t.genres).forEach((g) => {
      freq[g] = (freq[g] || 0) + 1;
    });
  });
  return freq;
}

function getRecommendations() {
  const titles = titleRepository.findAll();
  const freq = buildGenreFrequency(titles);

  if (Object.keys(freq).length === 0) {
    return { recommendations: [], reason: 'no-ratings' };
  }

  const pending = titles.filter((t) => t.status === 'pending');

  if (pending.length === 0) {
    return { recommendations: [], reason: 'no-pending' };
  }

  const scored = pending.map((t) => {
    const genres = parseGenres(t.genres);
    const score = genres.reduce((sum, g) => sum + (freq[g] || 0), 0);
    return { ...t, _score: score };
  });

  const recommendations = scored
    .filter((t) => t._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, TOP_N)
    .map(({ _score, ...t }) => t);

  if (recommendations.length === 0) {
    return { recommendations: [], reason: 'no-match' };
  }

  return { recommendations, reason: 'ok' };
}

module.exports = { getRecommendations };
