const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const { pickTonight, clearCache } = require('../services/tonightService.js');

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
    comedy: add(user.id, { title: 'Short Comedy', tmdb_id: 501, genres: '["Comedy"]', status: 'pending', runtime: 88 }).id,
    epic:   add(user.id, { title: 'Long Epic', tmdb_id: 502, genres: '["Drama","History"]', status: 'pending', runtime: 201 }).id,
    horror: add(user.id, { title: 'Scary One', tmdb_id: 503, genres: '["Horror"]', status: 'pending', runtime: 99 }).id,
    show:   add(user.id, { title: 'Half Show', type: 'series', tmdb_id: 504, genres: '["Comedy"]', status: 'watching', runtime: 25 }).id,
  };
  return { user, ids };
}

function film(id, title, extra = {}) {
  return {
    tmdb_id: id, type: 'movie', title, overview: `About ${title}`, poster_path: '/x.jpg', release_year: 2019, release_date: '2019-01-01',
    upcoming: false, original_language: 'en', genres: ['Horror'], vote_average: 7.4, vote_count: 2500, popularity: 1, adult: false, readable: true, ...extra,
  };
}

function fakeTmdb({ discover = [], recs = {}, keywords = {}, titles = {} } = {}) {
  return {
    discover: vi.fn(async () => discover),
    getTitleRecommendations: vi.fn(async (id) => recs[id] ?? []),
    searchKeyword: vi.fn(async (q) => keywords[q] ?? null),
    searchTyped: vi.fn(async (q, type) => titles[`${type}:${q}`] ?? []),
    getWatchProviders: vi.fn(async () => ({ groups: { flatrate: [{ id: 8, name: 'Netflix', logo_path: '/n.jpg' }], free: [] } })),
  };
}

const keys = (r) => r.picks.map((p) => p.key);
const fixed = () => 0;

describe('tonight without AI', () => {
  it('reads the request and picks pending titles that fit the time', async () => {
    const { user, ids } = await viewer();
    const r = await pickTonight(user.id, { mood: 'algo ligero, 90 minutos, estoy cansado', runtime: 'any', source: 'pending' }, { tmdb: fakeTmdb(), random: fixed });
    expect(r).toMatchObject({ reason: 'ok', source: 'rule-based', fallbackReason: 'no-api-key', limit: 95, understoodBy: 'rules' });
    expect(r.chips).toEqual(expect.arrayContaining(['Comedia', 'Sin terror', 'Hasta 90 min']));
    expect(keys(r)[0]).toBe(`c${ids.comedy}`);
    expect(keys(r)).not.toContain(`c${ids.epic}`);   // 201 minutes does not fit
    expect(keys(r)).not.toContain(`c${ids.horror}`); // light mood leaves horror out
    expect(r.picks[0].reason).toBe('Ya la tienes en pendientes, es de comedia y dura 88 minutos, así que te alcanza el tiempo.');
    expect(r.picks[0]).toMatchObject({ providers: [{ name: 'Netflix' }], onMine: false });
  });

  it('does not offer a pending drama for a science fiction drama just for being a drama', async () => {
    const { user, ids } = await viewer();
    const r = await pickTonight(user.id, { mood: 'ciencia ficción con drama', source: 'pending' }, { tmdb: fakeTmdb(), random: fixed });
    expect(r.reason).toBe('no-options'); // "Long Epic" is a drama, but not science fiction
    const horror = await pickTonight(user.id, { mood: 'terror y drama', source: 'pending' }, { tmdb: fakeTmdb(), random: fixed });
    expect(horror.picks.map((p) => p.key)).toEqual([`c${ids.horror}`]);
  });

  it('only offers series for "un episodio"', async () => {
    const { user, ids } = await viewer();
    const r = await pickTonight(user.id, { mood: '', runtime: 'episode', source: 'pending' }, { tmdb: fakeTmdb(), random: fixed });
    expect(keys(r)).toEqual([`c${ids.show}`]);
    expect(r.picks[0].reason).toMatch(/^Ya la empezaste/);
  });

  it('finds new titles by genre, topic and decade, and up to nine of them', async () => {
    const { user } = await viewer();
    const tmdb = fakeTmdb({ discover: Array.from({ length: 12 }, (_, i) => film(900 + i, `Fright ${'ABCDEFGHIJKL'[i]}rom`, { release_year: 1985 })), keywords: { zombie: 12377 } });
    const r = await pickTonight(user.id, { mood: 'quiero miedo, una de zombis de los 80', runtime: '120', source: 'new' }, { tmdb, random: fixed });
    expect(r.picks).toHaveLength(9);
    expect(r.picks.every((p) => p.kind === 'tmdb')).toBe(true);
    expect(tmdb.discover.mock.calls[0][1]).toMatchObject({
      with_genres: '27', with_keywords: '12377', 'primary_release_date.gte': '1980-01-01', 'primary_release_date.lte': '1989-12-31', 'with_runtime.lte': 125,
    });
    expect(r.picks[0].reason).toMatch(/como pediste/);
  });

  it('uses a title named as a model', async () => {
    const { user } = await viewer();
    const interstellar = film(157336, 'Interstellar', { genres: ['Science Fiction'], release_year: 2014 });
    const tmdb = fakeTmdb({
      titles: { 'movie:Interstellar': [interstellar] },
      recs: { 157336: [film(286217, 'The Martian', { genres: ['Science Fiction'] })] },
    });
    const r = await pickTonight(user.id, { mood: 'algo como Interstellar', source: 'new' }, { tmdb, random: fixed });
    expect(r.chips).toContain('Como “Interstellar”');
    expect(r.picks[0]).toMatchObject({ key: 'movie:286217' });
    expect(r.picks[0].reason).toMatch(/^Se parece a “Interstellar”, que mencionaste\./);
  });

  it('keeps "Ambos" mixed and never repeats what is already on screen', async () => {
    const { user, ids } = await viewer();
    const tmdb = fakeTmdb({ discover: Array.from({ length: 10 }, (_, i) => film(700 + i, `New ${'ABCDEFGHIJ'[i]}one`, { vote_average: 8.4 })) });
    const first = await pickTonight(user.id, { mood: 'quiero miedo', source: 'both' }, { tmdb, random: fixed });
    expect(keys(first)).toContain(`c${ids.horror}`);
    expect(first.picks.filter((p) => p.kind === 'tmdb').length).toBeGreaterThan(0);
    const more = await pickTonight(user.id, { mood: 'quiero miedo', source: 'both', exclude: keys(first) }, { tmdb, random: fixed, refresh: true });
    expect(keys(more).some((k) => keys(first).includes(k))).toBe(false);
  });

  it('validates input and handles an empty catalog', async () => {
    const user = await createUser();
    await expect(pickTonight(user.id, { mood: 'x'.repeat(401) })).rejects.toThrow('400 caracteres');
    await expect(pickTonight(user.id, { runtime: 'forever' })).rejects.toThrow('Duración no válida.');
    await expect(pickTonight(user.id, { exclude: 'nope' })).rejects.toThrow('no es válida');
    expect(await pickTonight(user.id, { mood: '' }, { tmdb: fakeTmdb() })).toMatchObject({ reason: 'insufficient-data', picks: [] });
  });
});

describe('tonight with AI', () => {
  const answer = (json) => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(json) }] } }] }), { status: 200 });
  const reading = (suggestions, extra = {}) => ({
    summary: 'Comedia corta', message: 'Noche de risas.', type: 'movie', genres: ['Comedy'], exclude_genres: [], topics: [], topics_es: [],
    year_from: 0, year_to: 0, max_runtime: 95, language: '', country: '', references: [], suggestions, ...extra,
  });

  it('reads the request and proposes titles with reasons in one call, keeping one pending title', async () => {
    const { user, ids } = await viewer();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const fetch = vi.fn(async () => answer(reading([
      { title: 'Booksmart', year: 2019, type: 'movie', reason: 'Una graduación caótica, como Superbad.' },
      { title: 'Made Up', year: 2020, type: 'movie', reason: 'Invented' },
      { title: 'The Nice Guys', year: 2016, type: 'movie', reason: 'Dupla torpe y muy divertida.' },
      { title: 'Game Night', year: 2018, type: 'movie', reason: 'Noche de juegos que se sale de control.' },
    ])));
    const tmdb = fakeTmdb({ titles: {
      'movie:Booksmart': [film(505623, 'Booksmart', { genres: ['Comedy'] })],
      'movie:The Nice Guys': [film(290250, 'Dos tipos peligrosos', { original_title: 'The Nice Guys', genres: ['Comedy', 'Crime'] })],
      'movie:Game Night': [film(445571, 'Noche de juegos', { original_title: 'Game Night', genres: ['Comedy'] })],
    } });
    const r = await pickTonight(user.id, { mood: 'una comedia corta', runtime: 'any', source: 'both' }, { tmdb, fetch, random: fixed });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ source: 'ai', message: 'Noche de risas.', understood: 'Comedia corta', understoodBy: 'ai', aiAvailable: true });
    expect(keys(r).slice(0, 4)).toEqual(['movie:505623', 'movie:290250', `c${ids.comedy}`, 'movie:445571']);
    expect(r.picks[0].reason).toBe('Una graduación caótica, como Superbad.');
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('<taste>');
    expect(prompt).toContain('- Superbad'); // already seen: never proposed
  });

  it('falls back to rules when the AI proposes too few real titles', async () => {
    const { user } = await viewer();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const fetch = vi.fn(async () => answer(reading([{ title: 'Ghost Film', year: 2000, type: 'movie', reason: 'x' }])));
    const tmdb = fakeTmdb({ discover: [film(800, 'Laughs', { genres: ['Comedy'] })] });
    const r = await pickTonight(user.id, { mood: 'una comedia', source: 'new' }, { tmdb, fetch, random: fixed });
    expect(r).toMatchObject({ source: 'rule-based', fallbackReason: 'empty-ai-response', message: 'Noche de risas.' });
    expect(keys(r)).toEqual(['movie:800']);
  });

  it('only orders the options for pending titles, in one call', async () => {
    const { user, ids } = await viewer();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const fetch = vi.fn(async () => answer({ message: 'De tu lista.', picks: [{ key: `c${ids.comedy}`, reason: 'Corta y divertida.' }, { key: 'c99999', reason: 'x' }] }));
    const r = await pickTonight(user.id, { mood: 'algo ligero', source: 'pending' }, { tmdb: fakeTmdb(), fetch, random: fixed });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ source: 'ai', understoodBy: 'rules' });
    expect(keys(r)).toEqual([`c${ids.comedy}`]);
  });

  it('answers at once in fast mode, without calling the AI, and says the AI will follow', async () => {
    const { user } = await viewer();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const fetch = vi.fn();
    const r = await pickTonight(user.id, { mood: 'quiero miedo', source: 'both' }, { tmdb: fakeTmdb({ discover: [film(900, 'Fright')] }), fetch, fast: true, random: fixed });
    expect(fetch).not.toHaveBeenCalled();
    expect(r).toMatchObject({ source: 'rule-based', provisional: true, aiAvailable: true, fallbackReason: null });
    expect(keys(r)).toContain('movie:900');
  });
});
