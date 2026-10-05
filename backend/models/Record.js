/**
 * @typedef {Object} Record
 * @property {number}  id
 * @property {number}  title_id
 * @property {string}  watched_date
 * @property {number|null} rating
 * @property {string|null} platform
 * @property {'pending'|'watching'|'completed'|'dropped'} status
 * @property {string|null} note
 */

function createRecord(fields = {}) {
  return {
    id: null,
    title_id: null,
    watched_date: null,
    rating: null,
    platform: null,
    status: 'pending',
    note: null,
    ...fields,
  };
}

module.exports = { createRecord };
