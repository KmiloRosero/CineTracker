import { canonicalGenres, genreLabel, genreKey, parseGenres } from './genres';
import { STATUS_LABEL, STATUS_OPTIONS, typeLabel, formatDate, formatNumber, parseStoredDate, formatStoredDate, formatDayMonth, formatMonthYear } from './labels';
import { trendOf } from '../components/Ticker';

describe('genres', () => {
  it('parses the stored JSON and ignores junk', () => {
    expect(parseGenres('["Drama", "", 3, "Comedy"]')).toEqual(['Drama', 'Comedy']);
    expect(parseGenres('not json')).toEqual([]);
    expect(parseGenres(null)).toEqual([]);
  });

  it('merges TV genres into the movie vocabulary', () => {
    expect(canonicalGenres('["Sci-Fi & Fantasy", "Science Fiction", "Drama"]')).toEqual(['Science Fiction', 'Fantasy', 'Drama']);
  });

  it('shows stored English names in Spanish and maps typed Spanish back', () => {
    expect(genreLabel('Science Fiction')).toBe('Ciencia ficción');
    expect(genreLabel('Thriller')).toBe('Suspenso');
    expect(genreLabel('Anime')).toBe('Anime'); // hand-typed genres pass through
    expect(genreKey('  ciencia ficción ')).toBe('Science Fiction');
    expect(genreKey('Acción')).toBe('Action');
    expect(genreKey('Anime')).toBe('Anime');
  });
});

describe('labels', () => {
  it('name statuses and types in Spanish', () => {
    expect(STATUS_LABEL).toEqual({ pending: 'Pendiente', watching: 'Viendo', completed: 'Completado', dropped: 'Abandonado' });
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(['pending', 'watching', 'completed', 'dropped']);
    expect(typeLabel('movie')).toBe('Película');
    expect(typeLabel('series')).toBe('Serie');
  });

  it('format dates and numbers the Colombian way', () => {
    expect(formatDate('2026-10-18T12:00:00Z')).toMatch(/^18 oct 2026$/);
    expect(formatDate('not a date')).toBe('');
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(7, 0)).toBe('7');
  });

  it('compute month-over-month trends without zero or unknown deltas', () => {
    expect(trendOf({ current: 5, previous: 2 })).toBe(3);
    expect(trendOf({ current: 2.6, previous: 0 }, 1)).toBe(2.6);
    expect(trendOf({ current: 4, previous: 4 })).toBeNull();
    expect(trendOf({ current: 4, previous: null })).toBeNull();
  });
});

describe('stored dates', () => {
  it('reads SQLite, ISO and bare TMDB dates without shifting the day', () => {
    expect(parseStoredDate('2026-03-01 15:00:00').toISOString()).toBe('2026-03-01T15:00:00.000Z');
    expect(parseStoredDate('2026-03-01T15:00:00.000Z').toISOString()).toBe('2026-03-01T15:00:00.000Z');
    expect(parseStoredDate('2026-10-28').getDate()).toBe(28);
    expect(formatStoredDate('2026-10-28')).toBe(formatDate(new Date(2026, 9, 28, 12)));
    expect(formatStoredDate('nope')).toBe('');
  });

  it('writes short and month labels in Spanish', () => {
    expect(formatDayMonth('2026-10-12')).toMatch(/^12 oct/);
    expect(formatMonthYear('2026-11-15')).toBe('Noviembre de 2026');
  });
});
