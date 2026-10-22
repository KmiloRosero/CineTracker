// Shared Spanish labels and formatting for values stored in English.

export const STATUS_LABEL = {
  pending:   'Pendiente',
  watching:  'Viendo',
  completed: 'Completado',
  dropped:   'Abandonado',
};

/** Status options in their usual order, for selects and filters. */
export const STATUS_OPTIONS = ['pending', 'watching', 'completed', 'dropped']
  .map((value) => ({ value, label: STATUS_LABEL[value] }));

export function typeLabel(type) {
  return type === 'movie' ? 'Película' : 'Serie';
}

const LOCALE = 'es-CO';

/** "18 oct 2026" from an ISO date or datetime; '' when it is not a date. */
export function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // built from parts: es-CO would otherwise write "18 de oct. de 2026"
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day} ${parts.month.replace('.', '')} ${parts.year}`;
}

/**
 * A Date from a stored value: SQLite writes UTC as "YYYY-MM-DD HH:MM:SS",
 * records carry full ISO strings, TMDB gives bare "YYYY-MM-DD" (read at
 * local noon so the day never shifts).
 */
export function parseStoredDate(value) {
  const text = String(value ?? '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T12:00:00`);
  return new Date(text.includes('T') ? text : `${text.replace(' ', 'T')}Z`);
}

/** formatDate for any stored value (see parseStoredDate). */
export function formatStoredDate(value) {
  return formatDate(parseStoredDate(value));
}

/** "12 oct" */
export function formatDayMonth(value) {
  const date = parseStoredDate(value);
  if (Number.isNaN(date.getTime())) return '';
  // same shape as formatDate, without the year
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.day} ${parts.month.replace('.', '')}`;
}

/** "Noviembre de 2026" */
export function formatMonthYear(value) {
  const label = parseStoredDate(value).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "miércoles, 28 de octubre" */
export function formatLongDay(value) {
  return parseStoredDate(value).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Number with Spanish separators (1.234,5). */
export function formatNumber(value, decimals = 0) {
  return Number(value).toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
