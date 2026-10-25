const { parseRules, readRequest, chipsOf } = require('../services/intentService.js');

afterEach(() => { process.env.GEMINI_API_KEY = ''; });

const NOW = new Date('2026-10-25T12:00:00');

function fakeTmdb({ keywords = {}, titles = {} } = {}) {
  return {
    searchKeyword: vi.fn(async (q) => keywords[q] ?? null),
    searchTyped: vi.fn(async (q, type) => titles[`${type}:${q}`] ?? []),
  };
}

const item = (id, title, type = 'movie', extra = {}) => ({ tmdb_id: id, type, title, original_title: title, vote_count: 5000, adult: false, release_year: 2014, ...extra });

describe('reading a request with Spanish rules', () => {
  it('finds genres, a decade, a country and runtime, ignoring accents', () => {
    const i = parseRules('Terror coreano de los 2000, algo de 90 minutos', NOW);
    expect(i).toMatchObject({ genres: ['Horror'], yearFrom: 2000, yearTo: 2009, language: 'ko', country: 'KR', maxRuntime: 95 });
  });

  it('separates what they reject from what they want', () => {
    const i = parseRules('una comedia romántica pero que no sea de terror ni de acción', NOW);
    expect(i.genres).toEqual(expect.arrayContaining(['Comedy', 'Romance']));
    expect(i.genres).not.toContain('Horror');
    expect(i.excludeGenres).toEqual(['Horror', 'Action']);
  });

  it('reads topics, series, recent titles and light moods', () => {
    expect(parseRules('una serie de robos con giros para maratonear', NOW)).toMatchObject({
      type: 'series',
      topics: [{ es: 'robos', en: 'heist' }, { es: 'giros inesperados', en: 'plot twist' }],
    });
    expect(parseRules('algo reciente', NOW).yearFrom).toBe(2023);
    const light = parseRules('algo ligero, estoy cansado', NOW);
    expect(light.genres).toContain('Comedy');
    expect(light.excludeGenres).toContain('Horror');
    expect(parseRules('para ver con los niños', NOW)).toMatchObject({ genres: ['Family', 'Animation'], excludeGenres: ['Horror'] });
  });

  it('picks up titles named as a model', () => {
    expect(parseRules('algo como Interstellar pero más corto', NOW).references).toEqual([{ title: 'Interstellar', year: null }]);
    expect(parseRules('parecida a "El Padrino", de mafia', NOW).references[0].title).toBe('El Padrino');
    expect(parseRules('algo para llorar', NOW).references).toEqual([]);
  });

  it('writes chips of what it understood', () => {
    const i = { ...parseRules('terror coreano de los 2000 sin comedia', NOW), referenceItems: [] };
    expect(chipsOf(i)).toEqual(['Terror', 'Sin comedia', 'Años 2000', 'Coreana']);
  });
});

describe('resolving a request on TMDB', () => {
  it('turns topics into keyword ids and keeps only named titles TMDB knows', async () => {
    const tmdb = fakeTmdb({
      keywords: { heist: 10051 },
      titles: { 'movie:Interstellar': [item(157336, 'Interstellar')] },
    });
    const r = await readRequest('una de robos como Interstellar', {}, { tmdb, rulesOnly: true });
    expect(r.keywordIds).toEqual([10051]);
    expect(r.referenceItems.map((x) => x.title)).toEqual(['Interstellar']);
    expect(r.chips).toEqual(['Robos', 'Como “Interstellar”']);
  });

  it('lets the AI read it, validating genres and verifying every suggested title', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const reply = {
      summary: 'Ciencia ficción con ideas',
      type: 'movie', genres: ['Science Fiction', 'Made Up'], exclude_genres: ['Horror'],
      topics: ['time travel'], topics_es: ['viajes en el tiempo'],
      year_from: 0, year_to: 0, max_runtime: 0, language: '', country: '',
      references: [{ title: 'Interstellar', year: 2014 }],
      suggestions: [{ title: 'Arrival', year: 2016, type: 'movie' }, { title: 'Invented Film', year: 2020, type: 'movie' }],
    };
    const fetch = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(reply) }] } }] }), { status: 200 }));
    const tmdb = fakeTmdb({
      keywords: { 'time travel': 4379 },
      titles: { 'movie:Interstellar': [item(157336, 'Interstellar')], 'movie:Arrival': [item(329865, 'La llegada', 'movie', { original_title: 'Arrival', release_year: 2016 })] },
    });
    const r = await readRequest('algo como Interstellar, que me haga pensar, nada de terror', { seen: ['Dune'] }, { tmdb, fetch });
    expect(r).toMatchObject({ source: 'ai', summary: 'Ciencia ficción con ideas', genres: ['Science Fiction'], excludeGenres: ['Horror'], keywordIds: [4379] });
    expect(r.suggestionItems.map((s) => s.tmdb_id)).toEqual([329865]);
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('- Dune');
  });

  it('falls back to the rules when the AI fails', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi.fn(async () => new Response('{}', { status: 503 }));
    const r = await readRequest('terror de los 80', {}, { tmdb: fakeTmdb(), fetch });
    spy.mockRestore();
    expect(r).toMatchObject({ source: 'rules', genres: ['Horror'], yearFrom: 1980 });
    expect(r.ai).toMatchObject({ ok: false, reason: 'api-error' });
  });
});
