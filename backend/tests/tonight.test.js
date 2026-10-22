const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const { pickTonight, moodGenres, runtimeFromMood, clearCache } = require('../services/tonightService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());
beforeEach(() => clearCache());
afterEach(() => { process.env.GEMINI_API_KEY = ''; });

const add = (userId, data) => titleService.addTitle(userId, { type: 'movie', status: 'completed', ...data });

async function viewer() {
  const user = await createUser();
  add(user.id, { title: 'Superbad', tmdb_id: 8363, genres: '["Comedy"]', rating: 9 });
  add(user.id, { title: 'Step Brothers', tmdb_id: 12133, genres: '["Comedy"]', rating: 8 });
  add(user.id, { title: 'Alien', tmdb_id: 348, genres: '["Horror","Science Fiction"]', rating: 9 });
  const ids = {
    comedy: add(user.id, { title: 'Short Comedy', genres: '["Comedy"]', status: 'pending', runtime: 88 }).id,
    epic:   add(user.id, { title: 'Long Epic', genres: '["Drama","History"]', status: 'pending', runtime: 201 }).id,
    horror: add(user.id, { title: 'Scary One', genres: '["Horror"]', status: 'pending', runtime: 99 }).id,
    show:   add(user.id, { title: 'Half Show', type: 'series', genres: '["Comedy"]', status: 'watching', runtime: 25 }).id,
  };
  return { user, ids };
}

const noTmdb = { getTitleRecommendations: vi.fn(async () => []), discover: vi.fn(async () => []) };

describe('reading the mood', () => {
  it('maps Spanish mood words to genres, ignoring accents', () => {
    expect(moodGenres('Algo ligero para reír, estoy cansado')[0]).toBe('Comedy');
    expect(moodGenres('quiero pasar MIEDO')).toEqual(['Horror', 'Thriller']);
    expect(moodGenres('no sé')).toEqual([]);
  });

  it('reads a time limit from the text', () => {
    expect(runtimeFromMood('tengo 90 minutos')).toBe(95);
    expect(runtimeFromMood('unas dos horas')).toBe(125);
    expect(runtimeFromMood('algo corto')).toBe(100);
    expect(runtimeFromMood('sin prisa')).toBeNull();
  });
});

describe('picking for tonight', () => {
  it('picks from pending titles by mood and time without AI', async () => {
    const { user, ids } = await viewer();
    const result = await pickTonight(user.id, { mood: 'algo ligero, 90 minutos, estoy cansado', runtime: 'any', source: 'pending' }, { tmdb: noTmdb });
    expect(result).toMatchObject({ reason: 'ok', source: 'rule-based', fallbackReason: 'no-api-key', limit: 95 });
    const keys = result.picks.map((p) => p.key);
    expect(keys[0]).toBe(`c${ids.comedy}`);
    expect(keys).not.toContain(`c${ids.epic}`); // 201 minutes does not fit
    expect(result.picks[0].reason).toBe('Es comedia y dura 88 minutos, así que te alcanza el tiempo: encaja con lo que tienes ganas de ver.');
    expect(noTmdb.discover).not.toHaveBeenCalled();
  });

  it('only offers series for "un episodio"', async () => {
    const { user, ids } = await viewer();
    const result = await pickTonight(user.id, { mood: '', runtime: 'episode', source: 'pending' }, { tmdb: noTmdb });
    expect(result.picks.map((p) => p.key)).toEqual([`c${ids.show}`]);
    expect(result.picks[0].reason).toMatch(/^Ya la empezaste/);
  });

  it('adds new TMDB titles with the mood genres when asked for something new', async () => {
    const { user } = await viewer();
    const tmdb = {
      getTitleRecommendations: vi.fn(async () => []),
      discover: vi.fn(async () => [{
        tmdb_id: 900, type: 'movie', title: 'New Fright', genres: ['Horror'], poster_path: '/x.jpg', readable: true,
        adult: false, upcoming: false, vote_average: 7.5, vote_count: 500, popularity: 1, release_year: 2022,
      }]),
    };
    const result = await pickTonight(user.id, { mood: 'quiero miedo', runtime: '120', source: 'new' }, { tmdb });
    expect(result.picks.map((p) => p.key)).toEqual(['t900']);
    expect(tmdb.discover.mock.calls[0][1]).toMatchObject({ with_genres: '27|53', 'with_runtime.lte': 125 });
  });

  it('keeps only the AI picks that are real options', async () => {
    const { user, ids } = await viewer();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const reply = { message: 'Noche de risas.', picks: [
      { key: `c${ids.comedy}`, reason: 'Corta y divertida.' },
      { key: 'c99999', reason: 'Invented' },
      { key: `c${ids.horror}`, reason: 'Por si te animas.' },
      { key: `c${ids.show}`, reason: 'La tienes a medias.' },
    ] };
    const fetch = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(reply) }] } }] }), { status: 200 }));
    const result = await pickTonight(user.id, { mood: 'algo ligero', runtime: 'any', source: 'pending' }, { tmdb: noTmdb, fetch });
    expect(result).toMatchObject({ source: 'ai', message: 'Noche de risas.' });
    expect(result.picks.map((p) => p.key)).toEqual([`c${ids.comedy}`, `c${ids.horror}`, `c${ids.show}`]);
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('ya la empezaste');
    expect(prompt).toContain('<mood>\nalgo ligero');
  });

  it('validates input and handles an empty catalog', async () => {
    const user = await createUser();
    await expect(pickTonight(user.id, { mood: 'x'.repeat(301) })).rejects.toThrow('300 caracteres');
    await expect(pickTonight(user.id, { runtime: 'forever' })).rejects.toThrow('Duración no válida.');
    expect(await pickTonight(user.id, { mood: 'algo' }, { tmdb: noTmdb })).toMatchObject({ reason: 'insufficient-data', picks: [] });
  });
});

describe('"Ambos"', () => {
  it('keeps at least one pending title and one new one', async () => {
    const { user, ids } = await viewer();
    const tmdb = {
      getTitleRecommendations: vi.fn(async () => []),
      discover: vi.fn(async () => [900, 901, 902].map((id) => ({
        tmdb_id: id, type: 'movie', title: `Fright ${id}`, genres: ['Horror', 'Thriller'], poster_path: '/x.jpg', readable: true,
        adult: false, upcoming: false, vote_average: 8.5, vote_count: 500, popularity: 1, release_year: 2022,
      }))),
    };
    const result = await pickTonight(user.id, { mood: 'quiero miedo', runtime: 'any', source: 'both' }, { tmdb });
    const keys = result.picks.map((p) => p.key);
    expect(keys).toHaveLength(3);
    expect(keys.filter((k) => k.startsWith('t'))).toHaveLength(2);
    expect(keys).toContain(`c${ids.horror}`);
  });
});
