const titleRepository  = require('../repositories/titleRepository.js');
const recordRepository = require('../repositories/recordRepository.js');
const { validateTitleInput } = require('../utils/validators.js');

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
  return titleRepository.update(id, data);
}

function deleteTitle(id) {
  const existing = titleRepository.findById(id);
  if (!existing) throw new Error(`Title not found: ${id}`);
  return titleRepository.remove(id);
}

module.exports = { addTitle, getAllTitles, getTitleWithRecords, updateTitle, deleteTitle };
