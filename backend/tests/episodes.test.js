const { useTempDatabase, createUser } = require('./helpers.js');
const titleService   = require('../services/titleService.js');
const episodeService = require('../services/episodeService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

/** Two seasons: S1 has 8 episodes, S2 has aired 3 of 10. */
function status({ last = { season: 2, episode: 3, air_date: daysAgo(2) }, next = null } = {}) {
  return {
    status: 'Returning Series',
    seasons: [
      { number: 1, name: 'Temporada 1', episode_count: 8, air_date: '2022-01-01', upcoming: false },
      { number: 2, name: 'Temporada 2', episode_count: 10, air_date: daysAgo(20), upcoming: false },
    ],
    lastEpisode: last,
    nextEpisode: next,
  };
}

function fakeTmdb(byId = {}) {
  return { getSeriesStatus: vi.fn(async (id) => byId[id] ?? status()) };
}

describe('episode tracking', () => {
  it('marks episodes, moves a pending series to watching and finds the next one', async () => {
    const user = await createUser();
    const show = titleService.addTitle(user.id, { title: 'Show', type: 'series', tmdb_id: 100 });
    const { title } = episodeService.setEpisodes(user.id, show.id, [{ season: 1, episode: 1 }, { season: 1, episode: 2 }]);
    expect(title.status).toBe('watching');

    const tracker = await episodeService.getTracker(user.id, show.id, { tmdb: fakeTmdb() });
    expect(tracker.seasons.map((s) => [s.number, s.aired, s.watched])).toEqual([[1, 8, 2], [2, 3, 0]]);
    expect(tracker.totals).toEqual({ aired: 11, watched: 2 });
    expect(tracker.next).toEqual({ season: 1, episode: 3 });

    episodeService.setEpisodes(user.id, show.id, Array.from({ length: 8 }, (_, i) => ({ season: 1, episode: i + 1 })));
    expect((await episodeService.getTracker(user.id, show.id, { tmdb: fakeTmdb() })).next).toEqual({ season: 2, episode: 1 });

    episodeService.setEpisodes(user.id, show.id, [{ season: 1, episode: 4 }], false);
    const after = await episodeService.getTracker(user.id, show.id, { tmdb: fakeTmdb() });
    expect(after.totals.watched).toBe(7);
    expect(after.next).toEqual({ season: 2, episode: 1 }); // after the furthest marked, not the gap
  });

  it('refuses movies, bad episodes and other users', async () => {
    const user = await createUser();
    const other = await createUser();
    const movie = titleService.addTitle(user.id, { title: 'Film', type: 'movie' });
    const show = titleService.addTitle(user.id, { title: 'Show', type: 'series' });
    expect(() => episodeService.setEpisodes(user.id, movie.id, [{ season: 1, episode: 1 }])).toThrow('Solo las series tienen episodios.');
    expect(() => episodeService.setEpisodes(user.id, show.id, [{ season: 1, episode: 0 }])).toThrow('Episodio no válido.');
    expect(() => episodeService.setEpisodes(user.id, show.id, [])).toThrow('No hay episodios para marcar.');
    expect(() => episodeService.setEpisodes(other.id, show.id, [{ season: 1, episode: 1 }])).toThrow('No se encontró el título.');
    // a manual series has no TMDB data but still keeps progress
    episodeService.setEpisodes(user.id, show.id, [{ season: 1, episode: 1 }]);
    expect(await episodeService.getTracker(user.id, show.id)).toMatchObject({ seasons: [], totals: { aired: null, watched: 1 } });
  });

  it('flags new episodes you have not marked and ones airing soon', async () => {
    const user = await createUser();
    const add = (data) => titleService.addTitle(user.id, { type: 'series', status: 'watching', ...data });
    const behind = add({ title: 'Behind', tmdb_id: 1 });
    const upToDate = add({ title: 'Up to date', tmdb_id: 2 });
    add({ title: 'Soon', tmdb_id: 3 });
    add({ title: 'Old news', tmdb_id: 4 });
    add({ title: 'Never started', tmdb_id: 5, status: 'pending' });
    episodeService.setEpisodes(user.id, behind.id, [{ season: 2, episode: 1 }]);
    episodeService.setEpisodes(user.id, upToDate.id, [{ season: 2, episode: 3 }]);
    const tmdb = fakeTmdb({
      3: status({ last: { season: 1, episode: 8, air_date: daysAgo(200) }, next: { season: 2, episode: 1, air_date: daysAgo(-5) } }),
      4: status({ last: { season: 1, episode: 8, air_date: daysAgo(90) } }),
    });
    const found = await episodeService.getNewEpisodes(user.id, { tmdb });
    expect(found.map((f) => [f.title.title, f.kind, f.behind])).toEqual([['Behind', 'new', 2], ['Soon', 'soon', null]]);
    expect(tmdb.getSeriesStatus).toHaveBeenCalledTimes(4); // the pending one is not followed
  });
});
