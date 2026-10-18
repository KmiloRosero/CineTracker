const titleRepository  = require('../repositories/titleRepository.js');
const recordRepository = require('../repositories/recordRepository.js');
const { validateTitleInput, validateTitleUpdate, validateId } = require('../utils/validators.js');

/** Returns the user's title or throws a user-facing "not found" error. */
function requireTitle(userId, id) {
  validateId(id, 'El id del título');
  const title = titleRepository.findById(userId, Number(id));
  if (!title) throw new Error('No se encontró el título.');
  return title;
}

function addTitle(userId, titleData) {
  validateTitleInput(titleData);
  if (titleData.tmdb_id != null && titleRepository.findByTmdbId(userId, titleData.tmdb_id)) {
    throw new Error(`"${titleData.title}" ya está en tu catálogo.`);
  }
  return titleRepository.create(userId, { ...titleData, title: titleData.title.trim() });
}

function getAllTitles(userId, filters = {}) {
  return titleRepository.findAll(userId, filters ?? {});
}

function getTitleWithRecords(userId, id) {
  const title = requireTitle(userId, id);
  const records = recordRepository.findByTitleId(userId, title.id);
  return { title, records };
}

function updateTitle(userId, id, data) {
  const existing = requireTitle(userId, id);
  validateTitleUpdate(data);
  return titleRepository.update(userId, existing.id, data);
}

function deleteTitle(userId, id) {
  const existing = requireTitle(userId, id);
  return titleRepository.remove(userId, existing.id);
}

module.exports = { requireTitle, addTitle, getAllTitles, getTitleWithRecords, updateTitle, deleteTitle };
