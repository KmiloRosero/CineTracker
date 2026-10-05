/**
 * @typedef {Object} List
 * @property {number}  id
 * @property {string}  name
 * @property {string}  created_at
 * @property {import('./Title').Title[]} [titles]
 */

function createList(fields = {}) {
  return {
    id: null,
    name: '',
    created_at: null,
    titles: [],
    ...fields,
  };
}

module.exports = { createList };
