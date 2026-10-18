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

/** Number with Spanish separators (1.234,5). */
export function formatNumber(value, decimals = 0) {
  return Number(value).toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
