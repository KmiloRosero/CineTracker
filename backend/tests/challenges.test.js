const { useTempDatabase, createUser } = require('./helpers.js');
const titleService     = require('../services/titleService.js');
const recordService    = require('../services/recordService.js');
const episodeService   = require('../services/episodeService.js');
const challengeService = require('../services/challengeService.js');
const { getDb } = require('../db/database.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());

const add = (userId, data) => titleService.addTitle(userId, { type: 'movie', status: 'completed', ...data });
const watch = (userId, title, iso) => recordService.addRecord(userId, { title_id: title.id, watched_date: iso, status: 'completed' });

describe('yearly challenge', () => {
  it('counts each title once per year, by kind, with the pace', async () => {
    const user = await createUser();
    const a = add(user.id, { title: 'A' });
    const b = add(user.id, { title: 'B' });
    const s = add(user.id, { title: 'S', type: 'series' });
    watch(user.id, a, '2025-02-01T20:00:00.000Z');
    watch(user.id, a, '2025-03-01T20:00:00.000Z'); // a rewatch still counts once
    watch(user.id, b, '2025-04-01T20:00:00.000Z');
    watch(user.id, s, '2025-05-01T20:00:00.000Z');
    watch(user.id, b, '2024-12-01T20:00:00.000Z'); // another year

    expect(challengeService.getChallenge(user.id, 2025)).toMatchObject({ goal: null, progress: 3 });
    challengeService.setChallenge(user.id, { year: 2025, goal: 12, kind: 'movie' });
    const midYear = new Date(2025, 6, 2); // day 183 of 365
    const c = challengeService.getChallenge(user.id, 2025, midYear);
    expect(c).toMatchObject({ goal: 12, kind: 'movie', progress: 2, expected: 6, ahead: -4, remaining: 10, done: false });
    expect(c.projected).toBe(4);
    expect(c.perWeek).toBeCloseTo(0.4, 1);

    expect(challengeService.getChallenge(user.id, 2024, midYear)).toMatchObject({ goal: null, progress: 1 });
    expect(challengeService.setChallenge(user.id, { year: 2025, goal: null }).goal).toBeNull();
  });

  it('validates goals', async () => {
    const user = await createUser();
    expect(() => challengeService.setChallenge(user.id, { goal: 0 })).toThrow('entre 1 y 1000');
    expect(() => challengeService.setChallenge(user.id, { goal: 10, kind: 'books' })).toThrow('Tipo de reto no válido.');
    expect(() => challengeService.getChallenge(user.id, 'x')).toThrow('Año no válido.');
  });
});

describe('weekly streaks', () => {
  it('counts consecutive weeks with any watch or episode, and flags a streak at risk', async () => {
    const user = await createUser();
    const now = new Date(2026, 9, 21, 12); // Wednesday 21 Oct 2026
    const film = add(user.id, { title: 'Film' });
    const show = titleService.addTitle(user.id, { title: 'Show', type: 'series', status: 'watching' });
    // weeks of 28 Sep, 5 Oct and 12 Oct, a gap, then two in August
    watch(user.id, film, new Date(2026, 8, 29, 21).toISOString());
    watch(user.id, film, new Date(2026, 9, 6, 21).toISOString());
    episodeService.setEpisodes(user.id, show.id, [{ season: 1, episode: 1 }]);
    getDb().prepare('UPDATE episode_progress SET watched_at = ? WHERE title_id = ?').run(new Date(2026, 9, 14, 21).toISOString(), show.id);
    watch(user.id, film, new Date(2026, 7, 3, 21).toISOString());
    watch(user.id, film, new Date(2026, 7, 10, 21).toISOString());

    const s = challengeService.getStreaks(user.id, now);
    expect(s).toMatchObject({ current: 3, best: 3, state: 'at-risk', thisWeek: 0 });
    expect(s.weeks).toHaveLength(26);
    expect(s.weeks.at(-1)).toEqual({ start: '2026-10-19', n: 0 });
    expect(s.weeks.at(-2)).toEqual({ start: '2026-10-12', n: 1 });

    watch(user.id, film, new Date(2026, 9, 20, 21).toISOString());
    expect(challengeService.getStreaks(user.id, now)).toMatchObject({ current: 4, best: 4, state: 'active', thisWeek: 1 });
  });

  it('has no streak without activity', async () => {
    const user = await createUser();
    expect(challengeService.getStreaks(user.id)).toMatchObject({ current: 0, best: 0, state: 'none' });
  });
});
