const titleRepository  = require('../repositories/titleRepository.js');
const recordRepository = require('../repositories/recordRepository.js');
const { validateTitleInput, validateTitleUpdate } = require('../utils/validators.js');

// Columns the renderer may change. The repository builds SQL from the keys it
// receives, so anything else (id, added_at, updated_at, unknown keys) is dropped.
const UPDATABLE_FIELDS = [
  'tmdb_id', 'type', 'title', 'original_title', 'overview', 'poster_path',
  'backdrop_path', 'release_year', 'genres', 'runtime', 'status', 'rating', 'notes',
];

function pickUpdatable(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => UPDATABLE_FIELDS.includes(key))
  );
}

function addTitle(titleData) {
  validateTitleInput(titleData);
  return titleRepository.create(titleData);
}

function getAllTitles(filters = {}) {
  return titleRepository.findAll(filters);
}

function getTitleWithRecords(id) {
  const title = titleRepository.findById(id);
  if (!title) throw new Error(`Title not found: ${id}`);
  const records = recordRepository.findByTitleId(id);
  return { title, records };
}

function updateTitle(id, data) {
  const existing = titleRepository.findById(id);
  if (!existing) throw new Error(`Title not found: ${id}`);
  validateTitleUpdate(data);
  const fields = pickUpdatable(data);
  if (Object.keys(fields).length === 0) return existing;
  return titleRepository.update(id, fields);
}

function deleteTitle(id) {
  const existing = titleRepository.findById(id);
  if (!existing) throw new Error(`Title not found: ${id}`);
  return titleRepository.remove(id);
}

module.exports = { addTitle, getAllTitles, getTitleWithRecords, updateTitle, deleteTitle };
