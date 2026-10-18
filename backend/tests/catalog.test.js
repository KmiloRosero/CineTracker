const { useTempDatabase, createUser } = require('./helpers.js');
const titleService  = require('../services/titleService.js');
const recordService = require('../services/recordService.js');
const listService   = require('../services/listService.js');
const titleRepository = require('../repositories/titleRepository.js');

let env, ana, bo;
beforeAll(async () => {
  env = useTempDatabase();
  ana = await createUser('Ana');
  bo  = await createUser('Bo');
});
afterAll(() => env.cleanup());

const dune = { title: 'Dune', type: 'movie', tmdb_id: 438631, genres: '["Sci-Fi"]', runtime: 155 };

describe('titles', () => {
  it('adds a title owned by the user and trims its name', () => {
    const t = titleService.addTitle(ana.id, { ...dune, title: '  Dune  ' });
    expect(t).toMatchObject({ user_id: ana.id, title: 'Dune', status: 'pending' });
  });

  it('allows the same TMDB title for different users but not twice for one user', () => {
    expect(titleService.addTitle(bo.id, dune).user_id).toBe(bo.id);
    expect(() => titleService.addTitle(ana.id, dune)).toThrow('"Dune" ya está en tu catálogo.');
  });

  it.each([
    [{ title: '', type: 'movie' }, 'El título es obligatorio.'],
    [{ title: 'X', type: 'documentary' }, 'El tipo debe ser uno de'],
    [{ title: 'X', type: 'movie', rating: 11 }, 'entre 1 y 10'],
    [{ title: 'X', type: 'movie', status: 'binged' }, 'El estado debe ser uno de'],
    [{ title: 'X', type: 'movie', release_year: 1700 }, 'El año de estreno'],
    [{ title: 'X', type: 'movie', genres: '{"not":"a list"}' }, 'Los géneros deben ser una lista'],
    [{ title: 'X'.repeat(201), type: 'movie' }, '200 caracteres'],
    [{ title: 'X', type: 'movie', cast_members: '[{"character":"no name"}]' }, 'El reparto debe ser una lista'],
    [{ title: 'X', type: 'movie', cast_members: 'not json' }, 'El reparto debe ser una lista'],
  ])('rejects invalid input %#', (input, message) => {
    expect(() => titleService.addTitle(ana.id, input)).toThrow(message);
  });

  it('stores the cast as given by TMDB', () => {
    const cast = JSON.stringify([{ name: 'Al Pacino', character: 'Vincent Hanna' }]);
    const t = titleService.addTitle(ana.id, { title: 'Heat (1995)', type: 'movie', cast_members: cast });
    expect(JSON.parse(t.cast_members)).toEqual([{ name: 'Al Pacino', character: 'Vincent Hanna' }]);
  });

  it("hides other users' titles from reads, updates and deletes", () => {
    const anas = titleService.getAllTitles(ana.id)[0];
    expect(titleService.getAllTitles(bo.id).map((t) => t.user_id)).toEqual([bo.id]);
    expect(() => titleService.getTitleWithRecords(bo.id, anas.id)).toThrow('No se encontró el título.');
    expect(() => titleService.updateTitle(bo.id, anas.id, { rating: 5 })).toThrow('No se encontró el título.');
    expect(() => titleService.deleteTitle(bo.id, anas.id)).toThrow('No se encontró el título.');
  });

  it('ignores columns that callers must not write (id, user_id, unknown keys)', () => {
    const t = titleService.getAllTitles(ana.id)[0];
    const updated = titleService.updateTitle(ana.id, t.id, {
      rating: 9, id: 999, user_id: bo.id, added_at: 'x', 'status = status; DROP TABLE titles; --': 1,
    });
    expect(updated).toMatchObject({ id: t.id, user_id: ana.id, rating: 9 });
    expect(env.db.prepare('SELECT COUNT(*) AS n FROM titles').get().n).toBeGreaterThan(0);
  });

  it('filters by status, type and search text', () => {
    titleService.addTitle(ana.id, { title: 'Severance', type: 'series', status: 'watching' });
    expect(titleService.getAllTitles(ana.id, { type: 'series' }).map((t) => t.title)).toEqual(['Severance']);
    expect(titleService.getAllTitles(ana.id, { status: 'watching' })).toHaveLength(1);
    expect(titleService.getAllTitles(ana.id, { search: 'dun' })).toHaveLength(1);
  });

  it('deletes a title with its watch records', () => {
    const t = titleService.addTitle(ana.id, { title: 'Temporary', type: 'movie' });
    recordService.addRecord(ana.id, { title_id: t.id });
    titleService.deleteTitle(ana.id, t.id);
    expect(titleRepository.findById(ana.id, t.id)).toBeUndefined();
    expect(env.db.prepare('SELECT COUNT(*) AS n FROM records WHERE title_id = ?').get(t.id).n).toBe(0);
  });
});

describe('watch records', () => {
  let title;
  beforeAll(() => { title = titleService.addTitle(ana.id, { title: 'Arrival', type: 'movie' }); });

  it('adds, updates and deletes a record for an owned title', () => {
    const r = recordService.addRecord(ana.id, { title_id: title.id, rating: 8, platform: 'Max' });
    expect(r).toMatchObject({ user_id: ana.id, status: 'completed', rating: 8 });

    const updated = recordService.updateRecord(ana.id, r.id, { rating: 10, note: 'Even better', title_id: 999 });
    expect(updated).toMatchObject({ rating: 10, note: 'Even better', title_id: title.id });

    recordService.deleteRecord(ana.id, r.id);
    expect(recordService.getRecordsByTitle(ana.id, title.id)).toEqual([]);
  });

  it('rejects bad dates, ratings and statuses', () => {
    expect(() => recordService.addRecord(ana.id, { title_id: title.id, watched_date: 'yesterday-ish' })).toThrow('no es válida');
    expect(() => recordService.addRecord(ana.id, { title_id: title.id, rating: 0 })).toThrow('entre 1 y 10');
    const r = recordService.addRecord(ana.id, { title_id: title.id });
    expect(() => recordService.updateRecordStatus(ana.id, r.id, 'nope')).toThrow('El estado debe ser uno de');
  });

  it("does not let another user touch the user's records", () => {
    const r = recordService.addRecord(ana.id, { title_id: title.id });
    expect(() => recordService.addRecord(bo.id, { title_id: title.id })).toThrow('No se encontró el título.');
    expect(() => recordService.updateRecord(bo.id, r.id, { rating: 1 })).toThrow('No se encontró el registro de visualización.');
    expect(() => recordService.deleteRecord(bo.id, r.id)).toThrow('No se encontró el registro de visualización.');
  });
});

describe('lists', () => {
  let title;
  beforeAll(() => { title = titleService.addTitle(ana.id, { title: 'Heat', type: 'movie' }); });

  it('creates, renames and deletes lists with unique names per user', () => {
    const list = listService.createList(ana.id, '  Weekend ');
    expect(list.name).toBe('Weekend');
    expect(() => listService.createList(ana.id, 'weekend')).toThrow('Ya tienes una lista llamada "weekend"');
    expect(listService.createList(bo.id, 'Weekend').user_id).toBe(bo.id);

    const other = listService.createList(ana.id, 'Classics');
    expect(() => listService.renameList(ana.id, other.id, 'WEEKEND')).toThrow('Ya tienes una lista');
    expect(listService.renameList(ana.id, list.id, 'Weekend')).toMatchObject({ name: 'Weekend' }); // same name is fine
    expect(listService.renameList(ana.id, other.id, 'Old classics').name).toBe('Old classics');

    listService.deleteList(ana.id, other.id);
    expect(() => listService.getList(ana.id, other.id)).toThrow('No se encontró la lista.');
  });

  it('adds and removes titles, and reports which lists contain a title', () => {
    const list = listService.getAllLists(ana.id).find((l) => l.name === 'Weekend');
    listService.addTitleToList(ana.id, list.id, title.id);
    listService.addTitleToList(ana.id, list.id, title.id); // idempotent
    expect(listService.getList(ana.id, list.id).titles.map((t) => t.id)).toEqual([title.id]);
    expect(listService.getListIdsForTitle(ana.id, title.id)).toEqual([list.id]);

    listService.removeTitleFromList(ana.id, list.id, title.id);
    expect(listService.getList(ana.id, list.id).titles).toEqual([]);
  });

  it("rejects names that are empty or too long, and other users' lists or titles", () => {
    expect(() => listService.createList(ana.id, '   ')).toThrow('El nombre de la lista es obligatorio.');
    expect(() => listService.createList(ana.id, 'x'.repeat(61))).toThrow('60 caracteres');
    const anasList = listService.getAllLists(ana.id)[0];
    const bosTitle = titleService.addTitle(bo.id, { title: 'Bo only', type: 'movie' });
    expect(() => listService.addTitleToList(bo.id, anasList.id, bosTitle.id)).toThrow('No se encontró la lista.');
    expect(() => listService.addTitleToList(ana.id, anasList.id, bosTitle.id)).toThrow('No se encontró el título.');
  });
});
