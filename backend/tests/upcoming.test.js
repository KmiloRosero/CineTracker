const { useTempDatabase, createUser } = require('./helpers.js');
const titleService    = require('../services/titleService.js');
const upcomingService = require('../services/upcomingService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const item = (id, title, days, extra = {}) => ({
  tmdb_id: id, type: 'movie', title, release_date: inDays(days), poster_path: '/p.jpg', readable: true, adult: false, genres: ['Horror'], ...extra,
});

describe('following and upcoming releases', () => {
  it('follows people and genres, validating both', async () => {
    const user = await createUser();
    upcomingService.follow(user.id, { kind: 'person', id: 137427, name: 'Denis Villeneuve', role: 'director' });
    const f = upcomingService.follow(user.id, { kind: 'genre', genre: 'Horror' });
    expect(f.people).toEqual([{ id: 137427, name: 'Denis Villeneuve', profile_path: null, role: 'director' }]);
    expect(f.genres).toEqual([{ genre: 'Horror', label: 'Terror' }]);
    expect(() => upcomingService.follow(user.id, { kind: 'genre', genre: 'Sci-Fi & Fantasy' })).toThrow('Género no válido.');
    expect(() => upcomingService.follow(user.id, { kind: 'band' })).toThrow();
    expect(upcomingService.unfollow(user.id, { kind: 'person', id: 137427 }).people).toEqual([]);
  });

  it('merges releases from followed people and genres, soonest first, with reasons', async () => {
    const user = await createUser();
    upcomingService.follow(user.id, { kind: 'person', id: 1, name: 'Ana Director' });
    upcomingService.follow(user.id, { kind: 'person', id: 2, name: 'Beto Actor' });
    upcomingService.follow(user.id, { kind: 'genre', genre: 'Horror' });
    const tmdb = {
      getPersonUpcoming: vi.fn(async (id) => (id === 1
        ? [{ ...item(10, 'Both of them', 40), role: 'director' }, { ...item(11, 'Too far', 900), role: 'director' }]
        : [{ ...item(10, 'Both of them', 40), role: 'cast' }])),
      discover: vi.fn(async () => [item(20, 'Scary soon', 5), item(21, 'Untranslated', 6, { readable: false })]),
    };
    const r = await upcomingService.getUpcoming(user.id, { tmdb });
    expect(r.items.map((i) => i.title)).toEqual(['Scary soon', 'Both of them']);
    expect(r.items[0].reason).toBe('Es de terror, un género que sigues.');
    expect(r.items[1].reason).toBe('Ana Director y Beto Actor participan en esta película.');
    expect(r.genres).toEqual([{ genre: 'Horror', label: 'Terror', auto: false }]);
  });

  it('follows the favourite genres automatically until some are chosen', async () => {
    const user = await createUser();
    titleService.addTitle(user.id, { title: 'A', type: 'movie', status: 'completed', rating: 9, genres: '["Comedy"]' });
    titleService.addTitle(user.id, { title: 'B', type: 'movie', status: 'completed', rating: 9, genres: '["Comedy"]' });
    const tmdb = { getPersonUpcoming: vi.fn(), discover: vi.fn(async () => [item(30, 'Funny', 10, { genres: ['Comedy'] })]) };
    const r = await upcomingService.getUpcoming(user.id, { tmdb });
    expect(r.genres).toEqual([{ genre: 'Comedy', label: 'Comedia', auto: true }]);
    expect(r.items[0].reason).toBe('Es de comedia, uno de tus géneros favoritos.');
    expect(tmdb.discover.mock.calls[0][1]).toMatchObject({ with_genres: '35', sort_by: 'popularity.desc' });
  });

  it('marks which people of a title are followed', async () => {
    const user = await createUser();
    upcomingService.follow(user.id, { kind: 'person', id: 5, name: 'Followed' });
    const tmdb = { getCredits: vi.fn(async () => ({ directors: [{ id: 5, name: 'Followed', role: 'director' }], cast: [{ id: 6, name: 'Other', role: 'cast' }] })) };
    const people = await upcomingService.getTitlePeople(user.id, 99, 'movie', { tmdb });
    expect(people.directors[0].followed).toBe(true);
    expect(people.cast[0].followed).toBe(false);
  });
});
