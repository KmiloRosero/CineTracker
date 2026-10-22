const { useTempDatabase, createUser } = require('./helpers.js');
const titleService  = require('../services/titleService.js');
const recordService = require('../services/recordService.js');
const dataTransfer  = require('../services/dataTransferService.js');
const { parseCsv, toCsv } = require('../utils/csv.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());

const DIARY = [
  'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date',
  '2024-01-02,Heat,1995,https://boxd.it/a,4.5,,,2024-01-01',
  '2024-03-02,Heat,1995,https://boxd.it/b,5,Yes,,2024-03-01',
  '2024-02-02,"Crouching Tiger, Hidden Dragon",2000,https://boxd.it/c,3.5,,,2024-02-01',
].join('\r\n');

const IMDB = [
  'Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors',
  'tt0113277,9,2023-05-01,Heat,Heat,https://imdb.com,movie,8.3,170,1995,Crime,700000,1995-12-15,Michael Mann',
  'tt0903747,10,2023-06-01,Breaking Bad,Breaking Bad,https://imdb.com,tvSeries,9.5,49,2008,Drama,2000000,2008-01-20,',
  'tt1234567,8,2023-07-01,Some Episode,,https://imdb.com,tvEpisode,8,45,2010,Drama,10,,',
].join('\n');

function fakeTmdb() {
  return {
    findByImdb: vi.fn(async (id) => ({ tt0113277: { tmdb_id: 949, type: 'movie' }, tt0903747: { tmdb_id: 1396, type: 'series' } }[id] ?? null)),
    searchTyped: vi.fn(async (title, type, y) => {
      if (title === 'Heat' && type === 'movie') return [{ tmdb_id: 949, title: 'Fuego contra fuego', original_title: 'Heat', release_year: 1995 }];
      if (title.startsWith('Crouching') && y === 2000) return [{ tmdb_id: 146, title: 'El tigre y el dragón', original_title: '臥虎藏龍', release_year: 2000 }];
      return [];
    }),
    getDetails: vi.fn(async (id, type) => ({ tmdb_id: id, type, title: `TMDB ${id}`, genres: ['Drama'], cast: [] })),
  };
}

describe('CSV', () => {
  it('parses quotes, commas, line breaks and a BOM, and writes them back', () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","he said ""hi""\nthen left"\n\n');
    expect(rows).toEqual([['a', 'b'], ['x, y', 'he said "hi"\nthen left']]);
    expect(parseCsv(toCsv(rows).replace(/^﻿/, ''))).toEqual(rows);
    expect(toCsv([['=SUM(A1)']])).toContain("'=SUM(A1)"); // no spreadsheet formulas
  });
});

describe('import', () => {
  it('reads a Letterboxd diary: one title per film with every watch, ratings out of 10', () => {
    const p = dataTransfer.preview(DIARY);
    expect(p).toMatchObject({ format: 'letterboxd-diary', label: 'Diario de Letterboxd', total: 2, ambiguous: false });
    expect(p.rows[0]).toMatchObject({ title: 'Heat', year: 1995, type: 'movie', rating: 10, status: 'completed', watchedDates: ['2024-01-01', '2024-03-01'] });
    expect(p.rows[1]).toMatchObject({ title: 'Crouching Tiger, Hidden Dragon', rating: 7 });
  });

  it('reads IMDb, skipping single episodes', () => {
    const p = dataTransfer.preview(IMDB);
    expect(p).toMatchObject({ format: 'imdb', total: 2, skipped: 1 });
    expect(p.rows.map((r) => [r.imdbId, r.type, r.rating])).toEqual([['tt0113277', 'movie', 9], ['tt0903747', 'series', 10]]);
  });

  it('treats a plain Letterboxd list as watched unless it is the watchlist', () => {
    const list = 'Date,Name,Year,Letterboxd URI\n2024-01-01,Dune,2021,https://boxd.it/d';
    expect(dataTransfer.preview(list).rows[0].status).toBe('completed');
    expect(dataTransfer.preview(list, { fileName: 'watchlist.csv' })).toMatchObject({ ambiguous: true, listAs: 'pending' });
    expect(dataTransfer.preview(list, { listAs: 'pending' }).rows[0].status).toBe('pending');
  });

  it('rejects files it does not know', () => {
    expect(() => dataTransfer.preview('foo,bar\n1,2')).toThrow('No reconocemos este archivo');
    expect(() => dataTransfer.preview('')).toThrow('El archivo está vacío.');
  });

  it('adds new titles with their watches and only fills what existing ones lack', async () => {
    const user = await createUser();
    const heat = titleService.addTitle(user.id, { title: 'Heat', type: 'movie', tmdb_id: 949, status: 'pending' });
    const tmdb = fakeTmdb();
    const { rows } = dataTransfer.preview(DIARY);
    const results = await dataTransfer.importBatch(user.id, rows, { tmdb });
    expect(results.map((r) => r.outcome)).toEqual(['updated', 'added']);

    const updated = titleService.getTitleWithRecords(user.id, heat.id);
    expect(updated.title).toMatchObject({ status: 'completed', rating: 10 });
    expect(updated.records.map((r) => r.watched_date.slice(0, 10)).sort()).toEqual(['2024-01-01', '2024-03-01']);

    // importing the same file again changes nothing
    const again = await dataTransfer.importBatch(user.id, rows, { tmdb });
    expect(again.map((r) => r.outcome)).toEqual(['unchanged', 'unchanged']);
  });

  it('matches IMDb rows by id and reports what it cannot find', async () => {
    const user = await createUser();
    const tmdb = fakeTmdb();
    const rows = [...dataTransfer.preview(IMDB).rows, { key: 9, title: 'Unknown film', year: 1990, type: 'movie', imdbId: null, tmdbId: null, rating: null, status: 'completed', watchedDates: [], notes: null }];
    const results = await dataTransfer.importBatch(user.id, rows, { tmdb });
    expect(results.map((r) => r.outcome)).toEqual(['added', 'added', 'not-found']);
    expect(tmdb.searchTyped).toHaveBeenCalledTimes(1); // only the row without an id is searched
    expect(titleService.getAllTitles(user.id).map((t) => t.type).sort()).toEqual(['movie', 'series']);
  });

  it('validates batches', async () => {
    const user = await createUser();
    await expect(dataTransfer.importBatch(user.id, [])).rejects.toThrow('No hay filas');
    await expect(dataTransfer.importBatch(user.id, [{ title: 'x', status: 'nope', watchedDates: [] }])).rejects.toThrow('no es válida');
  });
});

describe('export', () => {
  it('round-trips a CineTracker backup and writes a Letterboxd file of watched films', async () => {
    const user = await createUser();
    const heat = titleService.addTitle(user.id, { title: 'Heat', type: 'movie', tmdb_id: 949, status: 'completed', rating: 9, release_year: 1995, notes: 'Top' });
    recordService.addRecord(user.id, { title_id: heat.id, watched_date: '2024-01-01T20:00:00.000Z', status: 'completed', rating: 9 });
    recordService.addRecord(user.id, { title_id: heat.id, watched_date: '2024-03-01T20:00:00.000Z', status: 'completed', rating: 9 });
    titleService.addTitle(user.id, { title: 'Show', type: 'series', tmdb_id: 1396, status: 'watching' });

    const backup = dataTransfer.exportCineTracker(user.id);
    expect(backup.fileName).toMatch(/^cinetracker-\d{4}-\d{2}-\d{2}\.csv$/);
    const p = dataTransfer.preview(backup.content);
    expect(p.format).toBe('cinetracker');
    expect(p.rows.find((r) => r.title === 'Heat')).toMatchObject({ tmdbId: 949, rating: 9, status: 'completed', watchedDates: ['2024-01-01', '2024-03-01'], notes: 'Top' });

    const lb = parseCsv(dataTransfer.exportLetterboxd(user.id).content.replace(/^﻿/, ''));
    expect(lb).toEqual([
      ['Title', 'Year', 'tmdbID', 'WatchedDate', 'Rating10', 'Rewatch'],
      ['Heat', '1995', '949', '2024-01-01', '9', ''],
      ['Heat', '1995', '949', '2024-03-01', '9', 'Yes'],
    ]);
  });
});
