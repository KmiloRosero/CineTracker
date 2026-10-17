const listRepository = require('../repositories/listRepository.js');
const { requireTitle } = require('./titleService.js');
const { validateId } = require('../utils/validators.js');

const MAX_NAME_LENGTH = 60;

function validateListName(name) {
  if (typeof name !== 'string' || name.trim() === '') throw new Error('List name is required.');
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`List name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }
  return name.trim();
}

function requireList(userId, id) {
  validateId(id, 'List id');
  const list = listRepository.findById(userId, Number(id));
  if (!list) throw new Error('List not found.');
  return list;
}

function getAllLists(userId) {
  return listRepository.findAllWithTitles(userId);
}

function createList(userId, name) {
  const clean = validateListName(name);
  const duplicate = listRepository.findAllWithTitles(userId)
    .some((l) => l.name.toLowerCase() === clean.toLowerCase());
  if (duplicate) throw new Error(`You already have a list named "${clean}".`);
  return listRepository.create(userId, clean);
}

function addTitleToList(userId, listId, titleId) {
  const list  = requireList(userId, listId);
  const title = requireTitle(userId, titleId);
  return listRepository.addTitle(list.id, title.id);
}

module.exports = { requireList, getAllLists, createList, addTitleToList };
