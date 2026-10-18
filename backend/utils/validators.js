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
    throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}. Received: "${status}".`);
  }
}

function validateRating(rating) {
  const num = Number(rating);
  if (!Number.isFinite(num)) {
    throw new Error(`Rating must be a finite number. Received: "${rating}".`);
  }
  if (num < 1 || num > 10) {
    throw new Error(`Rating must be between 1 and 10. Received: ${num}.`);
  }
}

function validateId(id, label = 'id') {
  const num = Number(id);
  if (!Number.isInteger(num) || num < 1) {
    throw new Error(`${label} must be a positive integer. Received: "${id}".`);
  }
}

/** Optional text field: null/undefined pass, otherwise a string within `max`. */
function validateOptionalText(value, label, max) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  if (value.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
}

/** Optional integer field within [min, max]. */
function validateOptionalInt(value, label, min, max) {
  if (value === undefined || value === null || value === '') return;
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
  }
}

function validateGenres(genres) {
  if (genres === undefined || genres === null) return;
  let parsed;
  try { parsed = typeof genres === 'string' ? JSON.parse(genres) : genres; } catch { parsed = null; }
  if (!Array.isArray(parsed) || parsed.some((g) => typeof g !== 'string')) {
    throw new Error('Genres must be a list of names.');
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
  if (!valid) throw new Error(`Cast must be a list of up to ${MAX_CAST} people with a name and an optional character.`);
}

// Shared checks for the optional title columns, used by create and update.
function validateTitleFields(data) {
  if ('type' in data && !VALID_TYPES.includes(data.type)) {
    throw new Error(`Type must be one of: ${VALID_TYPES.join(', ')}. Received: "${data.type}".`);
  }
  if (data.status !== undefined) validateStatus(data.status);
  if (data.rating !== undefined && data.rating !== null) validateRating(data.rating);
  validateOptionalText(data.overview, 'Overview', LIMITS.overview);
  validateOptionalText(data.notes, 'Notes', LIMITS.notes);
  validateOptionalInt(data.release_year, 'Release year', 1870, 2100);
  validateOptionalInt(data.runtime, 'Runtime', 0, 2000);
  validateGenres(data.genres);
  validateCast(data.cast_members);
}

function validateTitleText(title) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title is required.');
  }
  if (title.trim().length > LIMITS.title) {
    throw new Error(`Title must be ${LIMITS.title} characters or fewer.`);
  }
}

function validateTitleInput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Title data must be a non-null object.');
  }
  validateTitleText(data.title);
  if (!VALID_TYPES.includes(data.type)) {
    throw new Error(`Type must be one of: ${VALID_TYPES.join(', ')}. Received: "${data.type}".`);
  }
  validateTitleFields(data);
}

// Partial update: only validates the fields that are present.
function validateTitleUpdate(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Update data must be a non-null object.');
  }
  if ('title' in data) validateTitleText(data.title);
  validateTitleFields(data);
}

function validateRecordFields(data) {
  if (data.status !== undefined) validateStatus(data.status);
  if (data.rating !== undefined && data.rating !== null) validateRating(data.rating);
  if (data.watched_date !== undefined && data.watched_date !== null
      && Number.isNaN(Date.parse(data.watched_date))) {
    throw new Error('Watched date is not a valid date.');
  }
  validateOptionalText(data.platform, 'Platform', LIMITS.platform);
  validateOptionalText(data.note, 'Note', LIMITS.note);
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
