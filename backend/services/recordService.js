const recordRepository = require('../repositories/recordRepository.js');
const { requireTitle } = require('./titleService.js');
const { validateId, validateRecordFields } = require('../utils/validators.js');

function requireRecord(userId, id) {
  validateId(id, 'El id del registro');
  const record = recordRepository.findById(userId, Number(id));
  if (!record) throw new Error('No se encontró el registro de visualización.');
  return record;
}

function addRecord(userId, record) {
  if (!record || typeof record !== 'object') throw new Error('Los datos del registro no son válidos.');
  const title = requireTitle(userId, record.title_id);
  validateRecordFields(record);
  return recordRepository.create(userId, { ...record, title_id: title.id });
}

function getRecordsByTitle(userId, titleId) {
  const title = requireTitle(userId, titleId);
  return recordRepository.findByTitleId(userId, title.id);
}

function updateRecord(userId, id, data) {
  const existing = requireRecord(userId, id);
  if (!data || typeof data !== 'object') throw new Error('Los datos a actualizar no son válidos.');
  validateRecordFields(data);
  return recordRepository.update(userId, existing.id, data);
}

function updateRecordStatus(userId, id, status, rating = null) {
  return updateRecord(userId, id, { status, rating });
}

function deleteRecord(userId, id) {
  const existing = requireRecord(userId, id);
  return recordRepository.remove(userId, existing.id);
}

module.exports = { addRecord, getRecordsByTitle, updateRecord, updateRecordStatus, deleteRecord };
