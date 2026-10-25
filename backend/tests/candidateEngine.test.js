const { weightedRating, sagaKey, weightedSample, buildFilters, discoverParams } = require('../services/candidateEngine.js');

describe('candidate engine', () => {
  it('pulls scores with few votes toward the average', () => {
    expect(weightedRating({ type: 'movie', vote_average: 9.5, vote_count: 3 })).toBeCloseTo(6.83, 1);
    expect(weightedRating({ type: 'movie', vote_average: 8.4, vote_count: 30000 })).toBeCloseTo(8.38, 1);
  });

  it('groups the parts of a saga but keeps number titles apart', () => {
    expect(sagaKey("Gabriel's Inferno: Part II")).toBe(sagaKey("Gabriel's Inferno"));
    expect(sagaKey('Saw III')).toBe(sagaKey('Saw'));
    expect(sagaKey('1917')).not.toBe(sagaKey('2001: Odisea del espacio'));
    expect(sagaKey('Alien')).not.toBe(sagaKey('Aliens'));
  });

  it('samples by weight without repeating', () => {
    const items = ['a', 'b', 'c', 'd'];
    const picked = weightedSample(items, 3, (x) => (x === 'd' ? 100 : 1), () => 0.5);
    expect(picked[0]).toBe('d');
    expect(new Set(picked).size).toBe(3);
  });

  it('leaves out TV specials and documentaries unless asked, and maps the request to discover', () => {
    const f = buildFilters({ type: 'movie', intent: { genres: ['Horror'], keywordIds: [12377], yearFrom: 1980, yearTo: 1989, language: 'ko' } });
    const p = discoverParams(f, { sort: 'popularity.desc', page: 1 });
    expect(p).toMatchObject({
      with_genres: '27', with_keywords: '12377', without_genres: '99,10770', with_original_language: 'ko',
      'primary_release_date.gte': '1980-01-01', 'primary_release_date.lte': '1989-12-31',
    });
    const doc = buildFilters({ type: 'movie', intent: { genres: ['Documentary'] } });
    expect(doc.excludeGenres).toEqual(['TV Movie']);
  });
});
