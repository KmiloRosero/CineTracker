const listRepository = require('../repositories/listRepository.js');
const { requireTitle } = require('./titleService.js');
const { validateId } = require('../utils/validators.js');

const MAX_NAME_LENGTH = 60;

function validateListName(name) {
  if (typeof name !== 'string' || name.trim() === '') throw new Error('El nombre de la lista es obligatorio.');
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`El nombre de la lista debe tener como máximo ${MAX_NAME_LENGTH} caracteres.`);
  }
  return name.trim();
}

function requireList(userId, id) {
  validateId(id, 'El id de la lista');
  const list = listRepository.findById(userId, Number(id));
  if (!list) throw new Error('No se encontró la lista.');
  return list;
}

function ensureNameAvailable(userId, name, exceptId = null) {
  const existing = listRepository.findByName(userId, name);
  if (existing && existing.id !== exceptId) {
    throw new Error(`Ya tienes una lista llamada "${name}".`);
  }
}

function getAllLists(userId) {
  return listRepository.findAllWithTitles(userId);
}

function getList(userId, id) {
  const list = requireList(userId, id);
  return listRepository.findByIdWithTitles(userId, list.id);
}

function createList(userId, name) {
  const clean = validateListName(name);
  ensureNameAvailable(userId, clean);
  return listRepository.create(userId, clean);
}

function renameList(userId, id, name) {
  const list  = requireList(userId, id);
  const clean = validateListName(name);
  ensureNameAvailable(userId, clean, list.id);
  return listRepository.rename(userId, list.id, clean);
}

function deleteList(userId, id) {
  const list = requireList(userId, id);
  return listRepository.remove(userId, list.id);
}

function addTitleToList(userId, listId, titleId) {
  const list  = requireList(userId, listId);
  const title = requireTitle(userId, titleId);
  return listRepository.addTitle(list.id, title.id);
}

function removeTitleFromList(userId, listId, titleId) {
  const list  = requireList(userId, listId);
  const title = requireTitle(userId, titleId);
  return listRepository.removeTitle(list.id, title.id);
}

/** Ids of the user's lists that already contain the title (for "Add to list" menus). */
function getListIdsForTitle(userId, titleId) {
  const title = requireTitle(userId, titleId);
  return listRepository.findListIdsForTitle(userId, title.id);
}

module.exports = {
  requireList, getAllLists, getList, createList, renameList, deleteList,
  addTitleToList, removeTitleFromList, getListIdsForTitle,
};
