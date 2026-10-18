const VALID_STATUSES = ['pending', 'watching', 'completed', 'dropped'];
const VALID_TYPES    = ['movie', 'series'];

const LIMITS = {
  title:    200,
  overview: 5000,
  notes:    2000,
  platform: 60,
  note:     1000,
};

function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`El estado debe ser uno de: ${VALID_STATUSES.join(', ')}. Recibido: "${status}".`);
  }
}

function validateRating(rating) {
  const num = Number(rating);
  if (!Number.isFinite(num)) {
    throw new Error(`La puntuación debe ser un número. Recibido: "${rating}".`);
  }
  if (num < 1 || num > 10) {
    throw new Error(`La puntuación debe estar entre 1 y 10. Recibido: ${num}.`);
  }
}

function validateId(id, label = 'id') {
  const num = Number(id);
  if (!Number.isInteger(num) || num < 1) {
    throw new Error(`${label} debe ser un número entero positivo. Recibido: "${id}".`);
  }
}

/** Optional text field: null/undefined pass, otherwise a string within `max`. */
function validateOptionalText(value, label, max) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string') throw new Error(`${label} debe ser texto.`);
  if (value.length > max) throw new Error(`${label} debe tener como máximo ${max} caracteres.`);
}

/** Optional integer field within [min, max]. */
function validateOptionalInt(value, label, min, max) {
  if (value === undefined || value === null || value === '') return;
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`${label} debe ser un número entero entre ${min} y ${max}.`);
  }
}

function validateGenres(genres) {
  if (genres === undefined || genres === null) return;
  let parsed;
  try { parsed = typeof genres === 'string' ? JSON.parse(genres) : genres; } catch { parsed = null; }
  if (!Array.isArray(parsed) || parsed.some((g) => typeof g !== 'string')) {
    throw new Error('Los géneros deben ser una lista de nombres.');
  }
}

const MAX_CAST = 20;

function validateCast(cast) {
  if (cast === undefined || cast === null) return;
  let parsed;
  try { parsed = typeof cast === 'string' ? JSON.parse(cast) : cast; } catch { parsed = null; }
  const valid = Array.isArray(parsed)
    && parsed.length <= MAX_CAST
    && parsed.every((m) => m && typeof m.name === 'string' && m.name.length <= 120
      && (m.character == null || (typeof m.character === 'string' && m.character.length <= 200)));
  if (!valid) throw new Error(`El reparto debe ser una lista de hasta ${MAX_CAST} personas, cada una con nombre y, si quieres, personaje.`);
}

// Shared checks for the optional title columns, used by create and update.
function validateTitleFields(data) {
  if ('type' in data && !VALID_TYPES.includes(data.type)) {
    throw new Error(`El tipo debe ser uno de: ${VALID_TYPES.join(', ')}. Recibido: "${data.type}".`);
  }
  if (data.status !== undefined) validateStatus(data.status);
  if (data.rating !== undefined && data.rating !== null) validateRating(data.rating);
  validateOptionalText(data.overview, 'La sinopsis', LIMITS.overview);
  validateOptionalText(data.notes, 'El campo de notas', LIMITS.notes);
  validateOptionalInt(data.release_year, 'El año de estreno', 1870, 2100);
  validateOptionalInt(data.runtime, 'La duración', 0, 2000);
  validateGenres(data.genres);
  validateCast(data.cast_members);
}

function validateTitleText(title) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('El título es obligatorio.');
  }
  if (title.trim().length > LIMITS.title) {
    throw new Error(`El título debe tener como máximo ${LIMITS.title} caracteres.`);
  }
}

function validateTitleInput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Los datos del título no son válidos.');
  }
  validateTitleText(data.title);
  if (!VALID_TYPES.includes(data.type)) {
    throw new Error(`El tipo debe ser uno de: ${VALID_TYPES.join(', ')}. Recibido: "${data.type}".`);
  }
  validateTitleFields(data);
}

// Partial update: only validates the fields that are present.
function validateTitleUpdate(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Los datos a actualizar no son válidos.');
  }
  if ('title' in data) validateTitleText(data.title);
  validateTitleFields(data);
}

function validateRecordFields(data) {
  if (data.status !== undefined) validateStatus(data.status);
  if (data.rating !== undefined && data.rating !== null) validateRating(data.rating);
  if (data.watched_date !== undefined && data.watched_date !== null
      && Number.isNaN(Date.parse(data.watched_date))) {
    throw new Error('La fecha en que lo viste no es válida.');
  }
  validateOptionalText(data.platform, 'La plataforma', LIMITS.platform);
  validateOptionalText(data.note, 'La nota', LIMITS.note);
}

module.exports = {
  VALID_STATUSES,
  VALID_TYPES,
  validateTitleInput,
  validateTitleUpdate,
  validateRecordFields,
  validateRating,
  validateStatus,
  validateId,
  validateOptionalText,
};
