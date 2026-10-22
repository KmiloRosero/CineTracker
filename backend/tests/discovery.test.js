const { useTempDatabase, createUser } = require('./helpers.js');
const titleService     = require('../services/titleService.js');
const listService      = require('../services/listService.js');
const discoveryService = require('../services/discoveryService.js');
const { getTasteProfile } = require('../services/tasteService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());
beforeEach(() => discoveryService.clearCache());
afterEach(() => {
  process.env.GEMINI_API_KEY = '';
  process.env.ANTHROPIC_API_KEY = '';
});

const add = (userId, data) => titleService.addTitle(userId, { type: 'movie', status: 'completed', ...data });

/** A horror fan with a couple of crime titles and one comedy they disliked. */
async function horrorFan() {
  const user = await createUser();
  add(user.id, { title: 'Hereditary', tmdb_id: 493922, genres: '["Horror","Mystery"]', rating: 10, release_year: 2018 });
  add(user.id, { title: 'The Witch',  tmdb_id: 310131, genres: '["Horror","Mystery"]', rating: 9, release_year: 2015 });
  add(user.id, { title: 'It Follows', tmdb_id: 270303, genres: '["Horror","Mystery"]', rating: 8, release_year: 2014 });
  add(user.id, { title: 'Heat',       tmdb_id: 949,    genres: '["Crime","Drama"]',    rating: 8, release_year: 1995 });
  add(user.id, { title: 'Zodiac',     tmdb_id: 1949,   genres: '["Crime","Thriller"]', rating: 7, release_year: 2007 });
  add(user.id, { title: 'Bad Comedy', tmdb_id: 111,    genres: '["Comedy"]',           rating: 3 });
  add(user.id, { title: 'Worse Comedy', tmdb_id: 112,  genres: '["Comedy"]',           rating: 4 });
  add(user.id, { title: 'Pending one', tmdb_id: 113,   genres: '["Horror"]', status: 'pending' });
  return user;
}

function candidate(id, title, extra = {}) {
  return {
    tmdb_id: id, type: 'movie', title, overview: `Synopsis of ${title}`, poster_path: `/p${id}.jpg`,
    backdrop_path: null, release_year: 2019, release_date: '2019-05-01', upcoming: false,
    original_title: title, original_language: 'en', genres: ['Horror'], vote_average: 7, vote_count: 900,
    popularity: 10, adult: false, readable: true, ...extra,
  };
}

/** A stand-in for tmdbService that records what was asked. */
function fakeTmdb({ recs = {}, discover = [] } = {}) {
  return {
    getTitleRecommendations: vi.fn(async (id) => recs[id] ?? []),
    discover: vi.fn(async () => discover),
    getDetails: vi.fn(async (id, type) => ({
      tmdb_id: id, type, title: `Title ${id}`, overview: 'From TMDB', poster_path: `/p${id}.jpg`,
      release_year: 2020, runtime: 100, genres: ['Horror'], cast: [],
    })),
  };
}

describe('taste profile', () => {
  it('ranks favourite genres by how highly they were rated and finds dislikes', async () => {
    const user = await horrorFan();
    const taste = getTasteProfile(user.id);
    expect(taste.favourites[0]).toBe('Horror');
    expect(taste.favourites).toContain('Mystery');
    expect(taste.favourites).not.toContain('Comedy');
    expect(taste.dislikes).toEqual(['Comedy']);
    expect(taste.counts).toMatchObject({ watched: 7, rated: 7, pending: 1 });
  });

  it('offers a mix, one style per favourite genre and the pairs that repeat', async () => {
    const user = await horrorFan();
    const ids = getTasteProfile(user.id).styles.map((s) => s.id);
    expect(ids[0]).toBe('mix');
    expect(ids).toContain('genre:Horror');
    expect(ids).toContain('pair:Horror|Mystery');
    const horror = getTasteProfile(user.id).styles.find((s) => s.id === 'genre:Horror');
    expect(horror).toMatchObject({ label: 'Terror', count: 3, avgRating: 9, type: 'movie' });
    expect(horror.seeds.map((t) => t.title)).toEqual(['Hereditary', 'The Witch', 'It Follows']);
  });

  it('has no styles for an empty catalog', async () => {
    const user = await createUser();
    expect(getTasteProfile(user.id).styles).toEqual([]);
    expect(await discoveryService.generateList(user.id, { styleId: 'mix', type: 'movie' })).toEqual({ reason: 'insufficient-data', items: [] });
  });
});

describe('generated lists', () => {
  it('ranks TMDB candidates by the seeds that led to them and explains them without AI', async () => {
    const user = await horrorFan();
    const tmdb = fakeTmdb({
      recs: {
        493922: [candidate(1, 'Midsommar'), candidate(2, 'The Babadook')],
        310131: [candidate(1, 'Midsommar')],
      },
      discover: [candidate(3, 'Talk to Me', { vote_average: 7.1 })],
    });
    const result = await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie' }, { tmdb });
    expect(result).toMatchObject({ reason: 'ok', source: 'rule-based', fallbackReason: 'no-api-key' });
    expect(result.items.map((i) => i.title)).toEqual(['Midsommar', 'The Babadook', 'Talk to Me']);
    expect(result.items[0].reason).toBe('TMDB la recomienda a quien disfrutó “Hereditary” y “The Witch”, que calificaste con 10 y 9.');
    expect(result.items[0].because).toEqual(['Hereditary', 'The Witch']);
    expect(result.items[2].reason).toMatch(/de tus géneros favoritos y tiene 7.1 en TMDB/);
    expect(result.name).toBe('Terror para ti');
  });

  it('leaves out titles already in the catalog, dismissed, untranslated, adult or unreleased', async () => {
    const user = await horrorFan();
    discoveryService.dismiss(user.id, { tmdb_id: 5, type: 'movie', title: 'Nope' });
    const tmdb = fakeTmdb({ discover: [
      candidate(493922, 'Hereditary'),                 // in the catalog
      candidate(113, 'Pending one'),                   // in the catalog (pending)
      candidate(5, 'Nope'),                            // dismissed
      candidate(6, 'Foreign', { readable: false }),
      candidate(7, 'Adult', { adult: true }),
      candidate(8, 'Soon', { upcoming: true }),
      candidate(9, 'No poster', { poster_path: null }),
      candidate(10, 'Fine'),
    ] });
    const result = await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie' }, { tmdb });
    expect(result.items.map((i) => i.title)).toEqual(['Fine']);
  });

  it('turns filters into discover parameters and skips seeds when runtime matters', async () => {
    const user = await horrorFan();
    const tmdb = fakeTmdb({ discover: [candidate(10, 'Short')] });
    const result = await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie', modifiers: ['shorter', 'darker', 'recent', 'classic', 'bogus'] }, { tmdb });
    expect(result.modifiers).toEqual(['classic', 'darker', 'shorter']); // the later of recent/classic wins, unknown ones go
    expect(tmdb.getTitleRecommendations).not.toHaveBeenCalled();
    const params = tmdb.discover.mock.calls[0][1];
    expect(params).toMatchObject({ with_genres: '27', 'with_runtime.lte': 100, 'primary_release_date.lte': '1995-12-31', without_genres: '35,10751,16' });
  });

  it('lets the AI choose among the candidates only and keeps its reasons', async () => {
    const user = await horrorFan();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const tmdb = fakeTmdb({ discover: [candidate(1, 'Midsommar'), candidate(2, 'The Babadook'), candidate(3, 'Talk to Me'), candidate(4, 'X')] });
    const body = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
      name: 'Terror que se queda contigo',
      intro: 'Para quien ama el miedo lento.',
      picks: [
        { tmdb_id: 2, reason: 'Duelo y terror en casa, como Hereditary.' },
        { tmdb_id: 999, reason: 'Invented' },
        { tmdb_id: 2, reason: 'Duplicate' },
        { tmdb_id: 1, reason: 'Folk horror diurno, como The Witch.' },
        { tmdb_id: 3, reason: 'Una posesión contada con nervio.' },
      ],
    }) }] } }] };
    const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    const result = await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie' }, { tmdb, fetch });
    expect(result).toMatchObject({ source: 'ai', provider: 'gemini', name: 'Terror que se queda contigo' });
    expect(result.items.map((i) => i.tmdb_id)).toEqual([2, 1, 3]);
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('tmdb_id 1: "Midsommar"');
    expect(prompt).toContain('"Hereditary" (película, 2018; Terror, Misterio): 10/10');
  });

  it('falls back to the rules when the AI picks fewer than three real candidates', async () => {
    const user = await horrorFan();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const tmdb = fakeTmdb({ discover: [candidate(1, 'Midsommar'), candidate(2, 'The Babadook')] });
    const body = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ name: 'x', intro: 'y', picks: [{ tmdb_id: 1, reason: 'ok' }] }) }] } }] };
    const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    const result = await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie' }, { tmdb, fetch });
    expect(result).toMatchObject({ source: 'rule-based', fallbackReason: 'empty-ai-response' });
    expect(result.items).toHaveLength(2);
  });

  it('caches a list until asked to refresh', async () => {
    const user = await horrorFan();
    const tmdb = fakeTmdb({ discover: [candidate(1, 'Midsommar')] });
    await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie' }, { tmdb });
    await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie' }, { tmdb });
    expect(tmdb.discover).toHaveBeenCalledTimes(2); // two pages, once
    await discoveryService.generateList(user.id, { styleId: 'genre:Horror', type: 'movie' }, { tmdb, refresh: true });
    expect(tmdb.discover).toHaveBeenCalledTimes(4);
  });
});

describe('saving a generated list', () => {
  it('adds new titles as pending, reuses catalog ones and keeps every reason', async () => {
    const user = await horrorFan();
    const tmdb = fakeTmdb();
    const { list, added } = await discoveryService.saveList(user.id, {
      name: 'Terror para ti',
      intro: 'Diez sustos con calma.',
      items: [
        { tmdb_id: 501, type: 'movie', reason: 'Primera razón.' },
        { tmdb_id: 113, type: 'movie', reason: 'Ya la tenías pendiente.' },
      ],
    }, { tmdb });
    expect(added).toBe(1);
    expect(list).toMatchObject({ name: 'Terror para ti', description: 'Diez sustos con calma.' });
    expect(list.titles.map((t) => [t.title, t.status, t.list_note])).toEqual([
      ['Title 501', 'pending', 'Primera razón.'],
      ['Pending one', 'pending', 'Ya la tenías pendiente.'],
    ]);
    expect(tmdb.getDetails).toHaveBeenCalledTimes(1);

    const again = await discoveryService.saveList(user.id, { name: 'Terror para ti', items: [{ tmdb_id: 501, type: 'movie' }] }, { tmdb });
    expect(again.list.name).toBe('Terror para ti (2)');
    expect(again.added).toBe(0);
    expect(listService.getAllLists(user.id)).toHaveLength(2);
  });

  it('rejects bad input before touching TMDB', async () => {
    const user = await createUser();
    const tmdb = fakeTmdb();
    await expect(discoveryService.saveList(user.id, { name: '', items: [] }, { tmdb })).rejects.toThrow('La lista necesita un nombre.');
    await expect(discoveryService.saveList(user.id, { name: 'X', items: [{ tmdb_id: 'a', type: 'movie' }] }, { tmdb })).rejects.toThrow(/id de TMDB/);
    expect(tmdb.getDetails).not.toHaveBeenCalled();
  });

  it('remembers and forgets dismissed titles per user', async () => {
    const a = await createUser();
    const b = await createUser();
    discoveryService.dismiss(a.id, { tmdb_id: 77, type: 'series', title: 'Meh show' });
    expect(discoveryService.getDismissed(a.id).map((d) => d.title)).toEqual(['Meh show']);
    expect(discoveryService.getDismissed(b.id)).toEqual([]);
    discoveryService.undismiss(a.id, 77, 'series');
    expect(discoveryService.getDismissed(a.id)).toEqual([]);
  });
});
