const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const { getTitleInsight, getTmdbInsight } = require('../services/insightService.js');

let env, user, ids;
beforeAll(async () => {
  env = useTempDatabase();
  user = await createUser();
  const add = (data) => titleService.addTitle(user.id, { type: 'movie', status: 'completed', ...data });
  add({ title: 'Hereditary', genres: '["Horror","Mystery"]', rating: 10 });
  add({ title: 'The Witch',  genres: '["Horror","Mystery"]', rating: 9 });
  add({ title: 'Bad Comedy', genres: '["Comedy"]', rating: 3 });
  ids = {
    pending: add({ title: 'Midsommar', genres: '["Horror","Mystery"]', status: 'pending' }).id,
    loved:   add({ title: 'Alien', genres: '["Horror"]', rating: 9 }).id,
    hated:   add({ title: 'Worse Comedy', genres: '["Comedy"]', rating: 2 }).id,
  };
});
afterAll(() => env.cleanup());
afterEach(() => { process.env.GEMINI_API_KEY = ''; });

function geminiFetch(json) {
  return vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(json) }] } }] }), { status: 200 }));
}

describe('title insight', () => {
  it('predicts a score for an unrated title from the same genres', async () => {
    const r = await getTitleInsight(user.id, ids.pending);
    expect(r).toMatchObject({ reason: 'ok', mode: 'predict', source: 'rule-based', fallbackReason: 'no-api-key', aiAvailable: false });
    // horror 9.3 ×3 and mystery 9.5 ×2, pulled toward the 6.6 mean
    expect(r.score).toBe(8.6);
    expect(r.verdict).toBe('Todo indica que te va a encantar.');
    expect(r.similar.map((t) => t.title)).toEqual(['Hereditary', 'The Witch']);
    expect(r.reasons[0]).toBe('Le das 9.3 de media a terror (3 títulos calificados).');
  });

  it('explains liked and disliked titles without counting their own rating', async () => {
    expect((await getTitleInsight(user.id, ids.loved)).mode).toBe('liked');
    const hated = await getTitleInsight(user.id, ids.hated);
    expect(hated).toMatchObject({ mode: 'disliked', verdict: 'No era lo tuyo: le diste 2, por debajo de tu media.' });
    expect(hated.reasons[0]).toBe('Le das 3 de media a comedia (1 título calificado).');
  });

  it('asks the AI only on refresh, then serves the saved answer', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const fetch = geminiFetch({ verdict: 'Te va a encantar.', score: 12, reasons: ['Folk horror como The Witch.'], similar: ['the witch', 'Nope'] });
    const before = await getTitleInsight(user.id, ids.pending, { fetch });
    expect(before).toMatchObject({ source: 'rule-based', fallbackReason: 'not-asked', aiAvailable: true });
    expect(fetch).not.toHaveBeenCalled();

    const asked = await getTitleInsight(user.id, ids.pending, { fetch, refresh: true });
    expect(asked).toMatchObject({ source: 'ai', verdict: 'Te va a encantar.', score: 10 });
    expect(asked.similar).toEqual([expect.objectContaining({ title: 'The Witch' })]);
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('Nota estimada por reglas: 8.6');

    expect(await getTitleInsight(user.id, ids.pending, { fetch })).toMatchObject({ source: 'ai', stale: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('needs a few other rated titles', async () => {
    const other = await createUser();
    const t = titleService.addTitle(other.id, { title: 'Solo', type: 'movie' });
    expect(await getTitleInsight(other.id, t.id)).toMatchObject({ reason: 'insufficient-data', needed: 3 });
    await expect(getTitleInsight(other.id, ids.pending)).rejects.toThrow('No se encontró el título.');
  });
});

describe('insight for a TMDB title not in the catalog', () => {
  const tmdb = {
    getDetails: vi.fn(async (id, type) => ({
      tmdb_id: id, type, title: 'The Babadook', overview: 'A mother and her son.', genres: ['Horror', 'Drama'], release_year: 2014, cast: [],
    })),
  };

  it('predicts from the same genres without adding the title', async () => {
    const before = titleService.getAllTitles(user.id).length;
    const r = await getTmdbInsight(user.id, 242224, 'movie', { tmdb });
    expect(r).toMatchObject({ reason: 'ok', mode: 'predict', source: 'rule-based' });
    expect(r.reasons[0]).toMatch(/terror/);
    expect(titleService.getAllTitles(user.id)).toHaveLength(before);
  });

  it('gives the catalog title its own insight when it is already there', async () => {
    const owned = titleService.addTitle(user.id, { title: 'Owned', type: 'movie', tmdb_id: 555, genres: '["Horror"]', status: 'completed', rating: 9 });
    const r = await getTmdbInsight(user.id, 555, 'movie', { tmdb });
    expect(r.mode).toBe('liked');
    titleService.deleteTitle(user.id, owned.id);
  });

  it('validates the id and type', async () => {
    await expect(getTmdbInsight(user.id, 'x', 'movie', { tmdb })).rejects.toThrow(/id de TMDB/);
    await expect(getTmdbInsight(user.id, 5, 'book', { tmdb })).rejects.toThrow(/tipo/);
  });
});
