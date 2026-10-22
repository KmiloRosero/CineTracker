const { useTempDatabase, createUser } = require('./helpers.js');
const titleService = require('../services/titleService.js');
const platformService = require('../services/platformService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());

const NETFLIX = { id: 8, name: 'Netflix', logo_path: '/n.jpg' };
const DISNEY = { id: 337, name: 'Disney Plus', logo_path: '/d.jpg' };

describe('my platforms', () => {
  it('saves, replaces and validates the list per user', async () => {
    const a = await createUser();
    const b = await createUser();
    expect(platformService.setPlatforms(a.id, [NETFLIX, DISNEY, NETFLIX]).map((p) => p.id)).toEqual([337, 8]);
    expect(platformService.getPlatforms(b.id)).toEqual([]);
    expect(platformService.setPlatforms(a.id, [DISNEY])).toEqual([{ id: 337, name: 'Disney Plus', logo_path: '/d.jpg' }]);
    expect(platformService.getPlatformIds(a.id)).toEqual([337]);
    expect(() => platformService.setPlatforms(a.id, [{ id: 'x', name: 'X' }])).toThrow('Plataforma no válida.');
    expect(() => platformService.setPlatforms(a.id, 'Netflix')).toThrow();
  });

  it('finds which pending titles are included in the saved platforms', async () => {
    const user = await createUser();
    platformService.setPlatforms(user.id, [NETFLIX]);
    const add = (data) => titleService.addTitle(user.id, { type: 'movie', status: 'pending', ...data });
    const onNetflix = add({ title: 'On Netflix', tmdb_id: 1 });
    add({ title: 'Rent only', tmdb_id: 2 });
    add({ title: 'Done', tmdb_id: 3, status: 'completed' });
    add({ title: 'Manual' });
    const groupsFor = {
      1: { flatrate: [{ id: 8, name: 'Netflix' }, { id: 8, name: 'Netflix' }], free: [], rent: [], buy: [] },
      2: { flatrate: [], free: [], rent: [{ id: 8, name: 'Netflix' }], buy: [] },
    };
    const tmdb = { getWatchProviders: vi.fn(async (id) => ({ groups: groupsFor[id] })) };
    const r = await platformService.getAvailability(user.id, { tmdb });
    expect(r).toMatchObject({ checked: 2, failed: 0 });
    expect(r.available).toEqual({ [onNetflix.id]: [NETFLIX] });
    expect(tmdb.getWatchProviders).toHaveBeenCalledTimes(2); // completed and manual titles are skipped
  });

  it('counts failures instead of throwing', async () => {
    const user = await createUser();
    platformService.setPlatforms(user.id, [NETFLIX]);
    titleService.addTitle(user.id, { type: 'movie', title: 'X', tmdb_id: 9 });
    const tmdb = { getWatchProviders: vi.fn(async () => { throw new Error('offline'); }) };
    expect(await platformService.getAvailability(user.id, { tmdb })).toMatchObject({ checked: 1, failed: 1, available: {} });
  });
});
