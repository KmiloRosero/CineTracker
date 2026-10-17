const recordRepository = require('../repositories/recordRepository.js');
const { requireTitle } = require('./titleService.js');
const { validateId, validateStatus, validateRating } = require('../utils/validators.js');

function validateRecordFields({ status, rating, watched_date: watchedDate }) {
  if (status !== undefined) validateStatus(status);
  if (rating !== undefined && rating !== null) validateRating(rating);
  if (watchedDate !== undefined && watchedDate !== null && Number.isNaN(Date.parse(watchedDate))) {
    throw new Error('Watched date is not a valid date.');
  }
}

function addRecord(userId, record) {
  if (!record || typeof record !== 'object') throw new Error('Record data must be a non-null object.');
  const title = requireTitle(userId, record.title_id);
  validateRecordFields(record);
  return recordRepository.create(userId, { ...record, title_id: title.id });
}

function getRecordsByTitle(userId, titleId) {
  const title = requireTitle(userId, titleId);
  return recordRepository.findByTitleId(userId, title.id);
}

function updateRecordStatus(userId, id, status, rating = null) {
  validateId(id, 'Record id');
  validateRecordFields({ status, rating });
  const existing = recordRepository.findById(userId, Number(id));
  if (!existing) throw new Error('Watch record not found.');
  return recordRepository.updateStatus(userId, existing.id, status, rating);
}

module.exports = { addRecord, getRecordsByTitle, updateRecordStatus };
