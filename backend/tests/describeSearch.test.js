const { findByDescription, clearCache } = require('../services/describeSearchService.js');

beforeEach(() => clearCache());
afterEach(() => { process.env.GEMINI_API_KEY = ''; });

const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

function geminiFetch(json) {
  return vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(json) }] } }] }), { status: 200 }));
}

const hit = (id, title, type = 'movie') => ({ tmdb_id: id, type, title, adult: false, poster_path: '/x.jpg', release_year: 2014 });

describe('finding a title from a description', () => {
  it('keeps only the AI guesses TMDB knows, with their clue', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const fetch = geminiFetch({ guesses: [
      { title: 'Edge of Tomorrow', year: 2014, type: 'movie', confidence: 'high', clue: 'Un soldado revive el mismo día.' },
      { title: 'Made Up Film', year: 2001, type: 'movie', confidence: 'low', clue: 'Nada.' },
      { title: 'Russian Doll', year: 2019, type: 'movie', confidence: 'medium', clue: 'Bucle temporal.' }, // wrong type on purpose
    ] });
    const tmdb = {
      searchTyped: vi.fn(async (title, type) => {
        if (title === 'Edge of Tomorrow' && type === 'movie') return [hit(137113, 'Al filo del mañana')];
        if (title === 'Russian Doll' && type === 'series') return [hit(73021, 'Muñeca rusa', 'series')];
        return [];
      }),
      search: vi.fn(),
    };
    const result = await findByDescription('un tipo revive el mismo día en una base militar', { fetch, tmdb });
    expect(result).toMatchObject({ source: 'ai', reason: 'ok' });
    expect(result.results.map((r) => [r.title, r.confidence])).toEqual([['Al filo del mañana', 'high'], ['Muñeca rusa', 'medium']]);
    expect(result.results[0].clue).toBe('Un soldado revive el mismo día.');
    expect(tmdb.search).not.toHaveBeenCalled();
  });

  it('falls back to a plain TMDB search without AI', async () => {
    const tmdb = { searchTyped: vi.fn(), search: vi.fn(async () => [hit(1, 'Dune')]) };
    const result = await findByDescription('dune', { tmdb });
    expect(result).toMatchObject({ source: 'rule-based', fallbackReason: 'no-api-key', reason: 'ok' });
    expect(result.results[0]).toMatchObject({ title: 'Dune', clue: null });
  });

  it('says when nothing matched', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const spy = quiet();
    const tmdb = { searchTyped: vi.fn(async () => []), search: vi.fn() };
    const result = await findByDescription('algo rarísimo', { fetch: geminiFetch({ guesses: [] }), tmdb });
    spy.mockRestore();
    expect(result).toMatchObject({ reason: 'no-results', results: [] });
  });

  it('validates the text', async () => {
    await expect(findByDescription('ab')).rejects.toThrow('al menos unas palabras');
    await expect(findByDescription('x'.repeat(401))).rejects.toThrow('400 caracteres');
  });
});
