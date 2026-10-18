const { useTempDatabase, createUser } = require('./helpers.js');
const titleService  = require('../services/titleService.js');
const recordService = require('../services/recordService.js');
const stats         = require('../services/statisticsService.js');

let env, user, other;
beforeAll(async () => {
  env   = useTempDatabase();
  user  = await createUser();
  other = await createUser();

  const add = (data) => titleService.addTitle(user.id, { type: 'movie', ...data });
  add({ title: 'A', genres: '["Drama","Crime"]', status: 'completed', rating: 9, runtime: 120 });
  add({ title: 'B', genres: '["Drama"]',         status: 'completed', rating: 7, runtime: 90 });
  add({ title: 'C', genres: '["Comedy"]',        status: 'watching',  type: 'series', runtime: 30 });
  add({ title: 'D', genres: '["Drama"]',         status: 'dropped' });
  add({ title: 'E', genres: '["Horror"]',        status: 'pending' });
  titleService.addTitle(other.id, { title: 'Not mine', type: 'movie', genres: '["Drama"]', status: 'completed', runtime: 999 });
});
afterAll(() => env.cleanup());

describe('statistics overview', () => {
  it('counts only the user\'s titles by status and type', () => {
    const o = stats.getOverview(user.id);
    expect(o.totals).toEqual({
      titles: 5, movies: 4, series: 1, pending: 1, watching: 1, completed: 2, dropped: 1,
    });
  });

  it('computes completion rate over started titles, average rating and hours', () => {
    const o = stats.getOverview(user.id);
    expect(o.completionRate).toBe(50);   // 2 completed of 4 started (watching + completed + dropped)
    expect(o.averageRating).toBe(8);
    expect(o.ratedCount).toBe(2);
    expect(o.totalHours).toBe(3.5);      // only completed titles: 120 + 90 minutes
  });

  it('ranks genres overall, among completed titles and by rating', () => {
    const o = stats.getOverview(user.id);
    expect(o.genreDistribution[0]).toEqual({ genre: 'Drama', n: 3 });
    expect(o.topGenres).toEqual([{ genre: 'Drama', n: 2 }, { genre: 'Crime', n: 1 }]);
    expect(o.topRatedGenres).toEqual([{ genre: 'Drama', avgRating: 8, n: 2 }]); // Crime has only 1 rated title
  });

  it('returns 12 zero-filled months of activity based on watch dates', () => {
    const t = titleService.addTitle(user.id, { title: 'Rewatched', type: 'movie' });
    const now = new Date();
    const twoMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 15)).toISOString();
    recordService.addRecord(user.id, { title_id: t.id, watched_date: twoMonthsAgo });

    const months = stats.getMonthlyWatched(user.id);
    expect(months).toHaveLength(12);
    expect(months.map((m) => m.month)).toEqual(stats.lastMonths(12));
    const key = twoMonthsAgo.slice(0, 7);
    expect(months.find((m) => m.month === key).n).toBe(1);
    // A and B were completed without records, so they count in the current month.
    expect(months[months.length - 1].n).toBe(2);
  });

  it('returns empty, zeroed statistics for a user with no titles', async () => {
    const fresh = await createUser();
    const o = stats.getOverview(fresh.id);
    expect(o.totals.titles).toBe(0);
    expect(o.completionRate).toBe(0);
    expect(o.averageRating).toBeNull();
    expect(o.totalHours).toBe(0);
    expect(o.monthlyActivity.every((m) => m.n === 0)).toBe(true);
  });

  it('compares this month with last month for dated stats', async () => {
    const u = await createUser();
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10)).toISOString();
    const a = titleService.addTitle(u.id, { title: 'Now', type: 'movie', runtime: 120 });
    const b = titleService.addTitle(u.id, { title: 'Before', type: 'movie', runtime: 60 });
    recordService.addRecord(u.id, { title_id: a.id, rating: 9 });
    recordService.addRecord(u.id, { title_id: a.id, rating: 7 });
    recordService.addRecord(u.id, { title_id: b.id, rating: 6, watched_date: lastMonth });

    const t = stats.getOverview(u.id).trends;
    expect(t.titlesAdded).toEqual({ current: 2, previous: 0 });
    expect(t.completed).toEqual({ current: 2, previous: 1 });
    expect(t.hours).toEqual({ current: 4, previous: 1 });
    expect(t.averageRating).toEqual({ current: 8, previous: 6 });
  });

  it('counts movie and series genres in one vocabulary', async () => {
    const u = await createUser();
    titleService.addTitle(u.id, { title: 'Dune', type: 'movie', genres: '["Science Fiction","Adventure"]' });
    titleService.addTitle(u.id, { title: 'Severance', type: 'series', genres: '["Sci-Fi & Fantasy","Drama"]' });
    const counts = Object.fromEntries(stats.getGenreCounts(u.id).map((g) => [g.genre, g.n]));
    expect(counts['Science Fiction']).toBe(2);
    expect(counts).not.toHaveProperty('Sci-Fi & Fantasy');
    expect(counts.Fantasy).toBe(1);
  });

  it('builds month keys across a year boundary', () => {
    expect(stats.lastMonths(3, new Date(Date.UTC(2026, 0, 10)))).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});
