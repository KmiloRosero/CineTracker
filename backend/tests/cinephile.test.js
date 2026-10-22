const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const { getCinephileProfile } = require('../services/cinephileService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());
afterEach(() => { process.env.GEMINI_API_KEY = ''; });

const add = (userId, data) => titleService.addTitle(userId, { type: 'movie', status: 'completed', ...data });

async function fan() {
  const user = await createUser();
  add(user.id, { title: 'Hereditary', genres: '["Horror"]', rating: 10, release_year: 2018 });
  add(user.id, { title: 'The Witch', genres: '["Horror"]', rating: 9, release_year: 2015 });
  add(user.id, { title: 'Alien', genres: '["Horror","Science Fiction"]', rating: 9, release_year: 1979 });
  add(user.id, { title: 'Bad Comedy', genres: '["Comedy"]', rating: 3 });
  add(user.id, { title: 'Worse Comedy', genres: '["Comedy"]', rating: 4 });
  return user;
}

function geminiFetch(json) {
  return vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(json) }] } }] }), { status: 200 }));
}

const portrait = {
  archetype: 'Fan del miedo lento',
  summary: 'Te gusta el terror que se toma su tiempo.',
  traits: [{ label: 'Exigente', detail: 'Nota media 7.' }, { label: 'Terror ante todo', detail: '3 de 5.' }, { label: '', detail: 'dropped' }],
  blindSpot: 'Prueba el documental.',
};

describe('cinephile profile', () => {
  it('needs a few watched titles first', async () => {
    const user = await createUser();
    add(user.id, { title: 'One', genres: '["Drama"]', rating: 8 });
    expect(await getCinephileProfile(user.id)).toEqual({ reason: 'insufficient-data', needed: 2 });
  });

  it('builds a portrait from the numbers without AI, never saving it', async () => {
    const user = await fan();
    const p = await getCinephileProfile(user.id);
    expect(p).toMatchObject({ reason: 'ok', source: 'rule-based', fallbackReason: 'no-api-key', archetype: 'Fan incondicional del terror' });
    expect(p.traits[0]).toEqual({ label: 'Tu género: Terror', detail: '3 títulos vistos con nota media de 9.3.' });
    expect(p.summary).toContain('“Hereditary”, con 10');
    expect(p.summary).toContain('comedia no te ha convencido');
    expect(p.blindSpot).toMatch(/documental/);
  });

  it('saves the AI portrait and serves it again, flagged stale once the catalog changes', async () => {
    const user = await fan();
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const fetch = geminiFetch(portrait);
    const first = await getCinephileProfile(user.id, { fetch });
    expect(first).toMatchObject({ source: 'ai', archetype: 'Fan del miedo lento', stale: false });
    expect(first.traits).toHaveLength(2); // the empty trait is dropped

    const again = await getCinephileProfile(user.id, { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(again).toMatchObject({ archetype: 'Fan del miedo lento', stale: false });

    add(user.id, { title: 'New one', genres: '["Drama"]', rating: 7 });
    expect((await getCinephileProfile(user.id, { fetch })).stale).toBe(true);
    await getCinephileProfile(user.id, { fetch, refresh: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
