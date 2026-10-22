const { useTempDatabase, createUser } = require('./helpers.js');
const titleService  = require('../services/titleService.js');
const recordService = require('../services/recordService.js');
const { getYearInReview, yearStats, getYears } = require('../services/wrappedService.js');

let env, user;
beforeAll(async () => {
  env = useTempDatabase();
  user = await createUser();
  const add = (data) => titleService.addTitle(user.id, { type: 'movie', status: 'completed', runtime: 120, ...data });
  const watch = (title, date, rating) => recordService.addRecord(user.id, { title_id: title.id, watched_date: date, status: 'completed', rating });
  const heat = add({ title: 'Heat', genres: '["Crime","Drama"]', rating: 9, release_year: 1995 });
  const alien = add({ title: 'Alien', genres: '["Horror"]', rating: 8, release_year: 1979 });
  const meh = add({ title: 'Meh', genres: '["Comedy"]', rating: 4, release_year: 2019 });
  const show = add({ title: 'Show', type: 'series', genres: '["Drama"]', runtime: 50, rating: 7, release_year: 2021 });
  // Fridays 2025-03-07 and 2025-03-14 (consecutive weeks), then a gap
  watch(heat, '2025-03-07T21:00:00.000Z', 9);
  watch(heat, '2025-03-14T21:00:00.000Z', 9);
  watch(alien, '2025-03-21T22:00:00.000Z', 8);
  watch(meh, '2025-06-03T20:00:00.000Z', 4);
  watch(show, '2025-11-28T20:00:00.000Z', 7);
  watch(alien, '2024-10-31T23:00:00.000Z', 8);
});
afterAll(() => env.cleanup());
afterEach(() => { process.env.GEMINI_API_KEY = ''; });

describe('year in review', () => {
  it('counts the year from the watch history', () => {
    const s = yearStats(user.id, 2025);
    expect(s).toMatchObject({ watches: 5, titles: 4, movies: 3, series: 1, hours: 8.8, averageRating: 7 });
    expect(s.busiestMonth).toMatchObject({ label: 'marzo', n: 3 });
    expect(s.favouriteWeekday).toMatchObject({ label: 'viernes', n: 4 });
    expect(s.longestWeekStreak).toBe(3);
    expect(s.topGenres[0]).toMatchObject({ genre: 'Drama', n: 2 });
    expect(s.best.map((t) => t.title)).toEqual(['Heat', 'Alien', 'Show']);
    expect(s.worst.title).toBe('Meh');
    expect(s.rewatched).toEqual([expect.objectContaining({ title: 'Heat', times: 2 })]);
    expect(s.first.title).toBe('Heat');
    expect(s.last.title).toBe('Show');
    expect(s.decade).toBe(1990);
  });

  it('lists the years with watches', () => {
    expect(getYears(user.id, new Date('2026-05-01'))).toEqual([2026, 2025, 2024]);
  });

  it('tells the year with rules when there is no AI, and says when a year is empty', async () => {
    const r = await getYearInReview(user.id, 2025);
    expect(r).toMatchObject({ reason: 'ok', source: 'rule-based', headline: 'Tu 2025: 4 títulos y 9 horas' });
    expect(r.story).toContain('Tu género del año fue drama');
    expect(r.awards[0]).toMatchObject({ title: 'Heat' });
    expect(await getYearInReview(user.id, 2019)).toMatchObject({ reason: 'empty', year: 2019 });
    await expect(getYearInReview(user.id, 'abc')).rejects.toThrow('Año no válido.');
  });

  it('keeps only awards for titles watched that year and saves the AI recap', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key-not-real';
    const reply = { headline: 'Un año de crimen', story: 'Viste mucho crimen.', awards: [
      { award: 'Repetido del año', title: 'heat', why: 'Dos veces.' },
      { award: 'Invento', title: 'Titanic', why: 'No la viste.' },
    ] };
    const fetch = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(reply) }] } }] }), { status: 200 }));
    const r = await getYearInReview(user.id, 2025, { fetch });
    expect(r).toMatchObject({ source: 'ai', headline: 'Un año de crimen' });
    expect(r.awards).toEqual([{ award: 'Repetido del año', title: 'Heat', why: 'Dos veces.' }]);
    await getYearInReview(user.id, 2025, { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
