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

describe('trailers', () => {
  beforeEach(() => tmdbService.clearTrailerCache());

  const video = (o) => ({ site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en', published_at: '2024-01-01T00:00:00Z', name: 'Trailer', ...o });

  it('picks a Spanish official trailer over English ones, teasers and other clips', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [
      video({ key: 'clip0000001', type: 'Clip', iso_639_1: 'es' }),
      video({ key: 'teaser00001', type: 'Teaser', iso_639_1: 'es' }),
      video({ key: 'english0001', name: 'Official Trailer' }),
      video({ key: 'spanish0001', iso_639_1: 'es', name: 'Tráiler oficial' }),
      video({ key: 'vimeo000001', site: 'Vimeo', iso_639_1: 'es' }),
    ] }));
    expect(await tmdbService.getTrailer(693134, 'movie')).toEqual({ key: 'spanish0001', name: 'Tráiler oficial', language: 'es', type: 'Trailer' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/3/movie/693134/videos');
    expect(url.searchParams.get('include_video_language')).toBe('es,en,null');
  });

  it('falls back to an English trailer, then to a teaser, and caches the answer', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [
      video({ key: 'teaser00001', type: 'Teaser', iso_639_1: 'es' }),
      video({ key: 'oldtrailer1', published_at: '2020-01-01T00:00:00Z' }),
      video({ key: 'newtrailer1', published_at: '2025-01-01T00:00:00Z' }),
    ] }));
    expect((await tmdbService.getTrailer(95396, 'series')).key).toBe('newtrailer1');
    expect((await tmdbService.getTrailer(95396, 'series')).key).toBe('newtrailer1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/3/tv/95396/videos');
  });

  it('returns null without trailers and ignores malformed YouTube keys', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [
      video({ key: 'bad"key<script>' }),
      video({ key: 'clip0000001', type: 'Featurette' }),
    ] }));
    expect(await tmdbService.getTrailer(7, 'movie')).toBeNull();
  });

  it('validates the id and type', async () => {
    await expect(tmdbService.getTrailer(-1, 'movie')).rejects.toThrow('entero positivo');
    await expect(tmdbService.getTrailer(1, 'game')).rejects.toThrow('"movie" o "series"');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('related titles', () => {
  beforeEach(() => tmdbService.clearTrailerCache());

  // Answers by path so each endpoint returns its own body.
  function routes(map) {
    fetchMock.mockImplementation(async (url) => {
      const u = new URL(url);
      const key = Object.keys(map).find((k) => u.pathname === `/3${k}`);
      return key ? jsonResponse(typeof map[key] === 'function' ? map[key](u) : map[key]) : jsonResponse({}, 404);
    });
  }

  it('orders a saga by release date, marks the current part and what is still to come', async () => {
    routes({
      '/movie/438631': {
        id: 438631, genres: [{ id: 878 }, { id: 12 }],
        belongs_to_collection: { id: 726871, name: 'Duna - Colección' },
        recommendations: { results: [
          { id: 693134, title: 'Duna: Parte dos', release_date: '2024-02-27', media_type: 'movie' }, // in the saga: skipped
          { id: 11, title: 'Star Wars', release_date: '1977-05-25', media_type: 'movie' },
          { id: 1399, name: 'Game of Thrones', media_type: 'tv' },                                   // other type: skipped
        ] },
      },
      '/collection/726871': { name: 'Duna - Colección', parts: [
        { id: 1170608, title: 'Duna: Parte tres', release_date: '2999-12-15' },
        { id: 438631,  title: 'Duna', release_date: '2021-09-15' },
        { id: 999,     title: 'Duna: sin fecha', release_date: '' },
        { id: 693134,  title: 'Duna: Parte dos', release_date: '2024-02-27' },
      ] },
      '/discover/movie': (u) => ({ results: u.searchParams.get('with_genres') === '878,12'
        ? [
          { id: 5, title: 'Pronto', release_date: '2999-01-01', poster_path: '/p.jpg', original_language: 'en' },
          { id: 6, title: 'メイドインアビス', original_title: 'メイドインアビス', original_language: 'ja', release_date: '2999-01-02', poster_path: '/j.jpg' }, // untranslated: skipped
          { id: 7, title: 'Sin póster', release_date: '2999-01-03', original_language: 'en' },                                     // no poster: skipped
          { id: 8, title: 'El viaje', original_title: '旅', original_language: 'ja', release_date: '2999-02-01', poster_path: '/v.jpg' }, // translated: kept
          { id: 1170608, title: 'Duna: Parte tres', release_date: '2999-12-15', poster_path: '/d.jpg', original_language: 'en' },
        ]
        : [] }),
    });

    const r = await tmdbService.getRelated(438631, 'movie');
    expect(r.collection.name).toBe('Duna - Colección');
    expect(r.collection.parts.map((p) => p.title)).toEqual(['Duna', 'Duna: Parte dos', 'Duna: Parte tres', 'Duna: sin fecha']);
    expect(r.collection.parts.map((p) => p.current)).toEqual([true, false, false, false]);
    expect(r.collection.parts.map((p) => p.upcoming)).toEqual([false, false, true, true]);
    expect(r.similar.map((s) => s.title)).toEqual(['Star Wars']);
    expect(r.upcoming.map((s) => s.title)).toEqual(['Pronto', 'El viaje']); // saga parts are not repeated
    expect(r.seasons).toEqual([]);

    const discover = fetchMock.mock.calls.map(([u]) => new URL(u)).find((u) => u.pathname === '/3/discover/movie');
    expect(discover.searchParams.get('primary_release_date.gte')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lists a series by season with its next episode, skipping specials', async () => {
    routes({
      '/tv/95396': {
        id: 95396, genres: [{ id: 18 }],
        seasons: [
          { season_number: 2, name: 'Temporada 2', episode_count: 10, air_date: '2025-01-16' },
          { season_number: 0, name: 'Especiales', episode_count: 1, air_date: '2021-12-15' },
          { season_number: 1, name: 'Temporada 1', episode_count: 9, air_date: '2022-02-17' },
          { season_number: 3, name: 'Temporada 3', episode_count: 0, air_date: null },
        ],
        next_episode_to_air: { season_number: 3, episode_number: 1, name: 'Hola', air_date: '2999-01-02' },
        recommendations: { results: [] },
      },
      '/discover/tv': { results: [] },
    });
    const r = await tmdbService.getRelated(95396, 'series');
    expect(r.collection).toBeNull();
    expect(r.seasons.map((s) => [s.number, s.upcoming])).toEqual([[1, false], [2, false], [3, true]]);
    expect(r.nextEpisode).toEqual({ season: 3, episode: 1, name: 'Hola', air_date: '2999-01-02' });
  });

  it('still returns the rest when the saga or the upcoming search fails, and caches the answer', async () => {
    routes({
      '/movie/7': { id: 7, genres: [{ id: 27 }], belongs_to_collection: { id: 404404 }, recommendations: { results: [{ id: 8, title: 'Otra' }] } },
    }); // collection and discover answer 404
    const r = await tmdbService.getRelated(7, 'movie');
    expect(r).toMatchObject({ collection: null, upcoming: [] });
    expect(r.similar.map((s) => s.title)).toEqual(['Otra']);
    const calls = fetchMock.mock.calls.length;
    await tmdbService.getRelated(7, 'movie');
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
