const VALID_STATUSES = ['pending', 'watching', 'completed', 'dropped'];
const VALID_TYPES    = ['movie', 'series'];

function validateTitleInput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Title data must be a non-null object.');
  }
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    throw new Error('Title field is required and must be a non-empty string.');
  }
  if (!VALID_TYPES.includes(data.type)) {
    throw new Error(`Type must be one of: ${VALID_TYPES.join(', ')}. Received: "${data.type}".`);
  }
  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}. Received: "${data.status}".`);
  }
  if (data.rating !== undefined && data.rating !== null) {
    validateRating(data.rating);
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

// Partial update: only validates the fields that are present.
function validateTitleUpdate(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Update data must be a non-null object.');
  }
  if ('title' in data && (typeof data.title !== 'string' || data.title.trim() === '')) {
    throw new Error('Title cannot be empty.');
  }
  if ('type' in data && !VALID_TYPES.includes(data.type)) {
    throw new Error(`Type must be one of: ${VALID_TYPES.join(', ')}. Received: "${data.type}".`);
  }
  if ('status' in data) validateStatus(data.status);
  if (data.rating !== undefined && data.rating !== null) validateRating(data.rating);
}

function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}. Received: "${status}".`);
  }
}

function validateId(id, label = 'id') {
  const num = Number(id);
  if (!Number.isInteger(num) || num < 1) {
    throw new Error(`${label} must be a positive integer. Received: "${id}".`);
  }
}

module.exports = { validateTitleInput, validateTitleUpdate, validateRating, validateStatus, validateId };
