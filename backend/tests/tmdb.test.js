const tmdbService = require('../services/tmdbService.js');

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

let fetchMock;
const savedKey = process.env.TMDB_API_KEY;

beforeEach(() => {
  process.env.TMDB_API_KEY = 'test-key-1234567890';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env.TMDB_API_KEY = savedKey ?? '';
});

describe('tmdbService', () => {
  it('searches movies and series only, normalized, at most 8', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      results: [
        { id: 1, media_type: 'movie', title: 'Dune', release_date: '2021-09-15', poster_path: '/a.jpg' },
        { id: 2, media_type: 'person', name: 'Somebody' },
        { id: 3, media_type: 'tv', name: 'Severance', first_air_date: '2022-02-18' },
        ...Array.from({ length: 10 }, (_, i) => ({ id: 10 + i, media_type: 'movie', title: `M${i}` })),
      ],
    }));
    const results = await tmdbService.search('dune');
    expect(results).toHaveLength(8);
    expect(results[0]).toMatchObject({ tmdb_id: 1, type: 'movie', title: 'Dune', release_year: 2021, poster_path: '/a.jpg' });
    expect(results[1]).toMatchObject({ tmdb_id: 3, type: 'series', title: 'Severance', release_year: 2022 });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/3/search/multi');
    expect(url.searchParams.get('query')).toBe('dune');
    expect(url.searchParams.get('include_adult')).toBe('false');
  });

  it('returns no results for empty text without calling TMDB', async () => {
    expect(await tmdbService.search('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gets details with genres, runtime and the top-billed cast', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      id: 438631, title: 'Dune', release_date: '2021-09-15', runtime: 155,
      genres: [{ id: 1, name: 'Science Fiction' }, { id: 2, name: 'Adventure' }],
      credits: { cast: [
        { name: 'Zendaya', character: 'Chani', order: 1 },
        { name: 'Timothée Chalamet', character: 'Paul Atreides', order: 0 },
      ] },
    }));
    const d = await tmdbService.getDetails(438631, 'movie');
    expect(d).toMatchObject({ type: 'movie', runtime: 155, genres: ['Science Fiction', 'Adventure'] });
    expect(d.cast.map((c) => c.name)).toEqual(['Timothée Chalamet', 'Zendaya']);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('append_to_response')).toBe('credits');
  });

  it('asks for Spanish metadata but stores genres by their English TMDB name', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      id: 693134, title: 'Duna: Parte dos', overview: 'Paul Atreides se une a los Fremen.',
      genres: [{ id: 878, name: 'Ciencia ficción' }, { id: 12, name: 'Aventura' }],
    }));
    const d = await tmdbService.getDetails(693134, 'movie');
    expect(d).toMatchObject({ title: 'Duna: Parte dos', genres: ['Science Fiction', 'Adventure'] });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('language')).toBe('es-MX');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the English synopsis when there is no Spanish one', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 7, title: 'Rare Film', overview: '' }))
      .mockResolvedValueOnce(jsonResponse({ id: 7, title: 'Rare Film', overview: 'An English synopsis.' }));
    const d = await tmdbService.getDetails(7, 'movie');
    expect(d.overview).toBe('An English synopsis.');
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('language')).toBe('en-US');
  });

  it('uses aggregate credits for series', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      id: 95396, name: 'Severance', first_air_date: '2022-02-18', episode_run_time: [55],
      aggregate_credits: { cast: [{ name: 'Adam Scott', roles: [{ character: 'Mark Scout' }], order: 0 }] },
    }));
    const d = await tmdbService.getDetails(95396, 'series');
    expect(d).toMatchObject({ type: 'series', runtime: 55, cast: [{ name: 'Adam Scott', character: 'Mark Scout' }] });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/3/tv/95396');
  });

  it('turns HTTP and network failures into clear messages', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(tmdbService.search('x')).rejects.toThrow('TMDB rechazó la clave');
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
    await expect(tmdbService.getDetails(1, 'movie')).rejects.toThrow('no se encontró en TMDB');
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(tmdbService.getTrending()).rejects.toThrow('No se pudo conectar con TMDB');
  });

  it('explains when no API key is configured', async () => {
    process.env.TMDB_API_KEY = '';
    await expect(tmdbService.search('dune')).rejects.toThrow('TMDB no está configurado');
  });

  it('validates ids and types before calling TMDB', async () => {
    await expect(tmdbService.getDetails('abc', 'movie')).rejects.toThrow('entero positivo');
    await expect(tmdbService.getDetails(1, 'book')).rejects.toThrow('"movie" o "series"');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
